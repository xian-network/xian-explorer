<template lang="pug">
  tm-page(title="Richlist")
    div(slot="menu"): tm-tool_bar
      router-link(:to="{ path: '/addresses', query: prevQuery }" v-if="hasPrevPage")
        i.material-icons chevron_left
        | Prev. Addresses
      router-link(:to="{ path: '/addresses', query: nextQuery }" v-if="hasNextPage")
        | Next Addresses
        i.material-icons chevron_right

    table.BlocksTable
      thead
        tr
          th Rank
          th Address
          th Balance
      tbody
        tr(v-for="(wallet, index) in addresses" :key="wallet.address")
          td {{ (currentPage - 1) * itemsPerPage + index + 1 }}
          td
            router-link(:to="`/addresses/${wallet.address}`")
              // Show the name if available, otherwise the address
              | {{ wallet.name ? wallet.name : wallet.address }}
          td {{ wallet.balance }}
</template>

<script>
import axios from "axios";
import { mapGetters } from "vuex";
import { TmPage, TmToolBar } from "@tendermint/ui";

// Change this if you have a separate file for these functions
async function execute_get_address_to_main_name(address, rpc) {
  let payload = {
    sender: "",
    contract: "con_name_service_final",
    function: "get_address_to_main_name",
    kwargs: { address }
  };

  let bytes = new TextEncoder().encode(JSON.stringify(payload));
  let hex = toHexString(bytes);

  // Fetch from your blockchain’s RPC
  let response = await fetch(rpc + '/abci_query?path="/simulate_tx/' + hex + '"');
  let data = await response.json();

  let decoded = atob(data.result.response.value || "");
  if (!decoded || decoded === "ée" || decoded === "AA==") {
    return "None";
  }

  decoded = JSON.parse(decoded);

  // If the Name Service returned an error
  if (decoded.status === 1) {
    return "None";
  }

  // The "result" may be quoted or contain single quotes
  let result = decoded.result.replaceAll("'", "");
  return result;
}

// Simple helper to convert byte arrays to hex strings
function toHexString(bytes) {
  return Array.from(bytes)
    .map((x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

const maxItemsPerPage = 20;

export default {
  name: "page-addresses",
  components: {
    TmPage,
    TmToolBar
  },
  data() {
    return {
      addresses: [],
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
    };
  },
  computed: {
    ...mapGetters([
      "blockchain", // Must return an object with at least 'rpc' (string)
    ]),
    hasPrevPage() {
      return this.currentPage > 1;
    },
    hasNextPage() {
      // If we got a full set of items, we assume there is a "next" page
      return this.addresses.length === this.itemsPerPage;
    },
    prevQuery() {
      if (!this.hasPrevPage) return {};
      return { page: this.currentPage - 1 };
    },
    nextQuery() {
      if (!this.hasNextPage) return {};
      return { page: this.currentPage + 1 };
    }
  },
  methods: {
    async fetchRichList(page) {
      // Update current page
      this.currentPage = page || this.currentPage;

      const offset = (this.currentPage - 1) * this.itemsPerPage;
      const query = `
        query RichList($limit: Int!, $offset: Int!) {
          allStates(
            filter: {and: {key: {startsWith: "currency.balances:", notLike: "%:%:%"}, valueNumeric: {greaterThan: "0"}}}
            first: $limit
            offset: $offset
            orderBy: VALUE_NUMERIC_DESC
          ) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      `;

      const variables = {
        limit: this.itemsPerPage,
        offset: offset
      };

      // 1) Fetch addresses & balances from GraphQL
      const response = await axios.post(`${this.blockchain.rpc}/graphql`, {
        query,
        variables
      });
      const edges = response.data.data.allStates.edges;

      // 2) Map to simple objects
      let addressesData = edges.map((edge) => {
        const { key, value } = edge.node;
        // key is something like "currency.balances:abcdef123..."
        const address = key.split(":")[1];
        return {
          address,
          balance: parseFloat(value).toFixed(8),
          name: null
        };
      });

      // 3) Look up each address’s main name from the Name Service
      //    Use Promise.all to do them all in parallel
      const resolvedNames = await Promise.all(
        addressesData.map((item) =>
          execute_get_address_to_main_name(item.address, this.blockchain.rpc)
        )
      );

      // 4) Insert name into the array if it’s not "None"
      addressesData = addressesData.map((item, i) => {
        const maybeName = resolvedNames[i];
        if (maybeName !== "None" && maybeName) {
          item.name = maybeName;
        }
        return item;
      });

      // 5) Finalize
      this.addresses = addressesData;
    }
  },
  async mounted() {
    // Initial fetch
    await this.fetchRichList();
  },
  watch: {
    // Re-run fetch whenever page query changes
    "$route": {
      immediate: true,
      handler() {
        const page = this.$route.query.page ? parseInt(this.$route.query.page) : 1;
        this.fetchRichList(page);
      }
    }
  }
};
</script>

<style lang="stylus">
.BlocksTable
  width 100%
  th
    color var(--dim)
    background var(--box-shadow)
    font-weight bold
    font-size 14px
  tr
    &:hover
      background-color var(--hover-bg)
  th, td
    padding 0.5rem 1rem
</style>
