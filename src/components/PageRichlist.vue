<template lang="pug">
  tm-page(title='Richlist')
    div(slot="menu"): tm-tool-bar
      router-link(:to="{ path: '/addresses', query: prevQuery }" v-if="hasPrevPage")
        i.material-icons chevron_left
        | Prev. Addresses
      router-link(:to="{ path: '/addresses', query: nextQuery }" v-if="hasNextPage")
        | Next Addresses
        i.material-icons chevron_right

    table.BlocksTable
      thead
        th Rank
        th Address
        th Balance
      tbody
        tr(v-for="(wallet, index) in addresses" :key="wallet.address")
          td {{ (currentPage - 1) * itemsPerPage + index + 1 }} <!-- Rank Number -->
          td {{ wallet.address }}
          td {{ wallet.balance }}
</template>

<script>
import axios from "axios";
import { mapGetters } from "vuex";
import { TmPage, TmToolBar } from "@tendermint/ui";

const maxItemsPerPage = 20;

// Regular expression to match addresses (assuming 64-character hex strings)
const addressRegex = /^[a-fA-F0-9]{64}$/;

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
      "blockchain",
    ]),
    hasPrevPage() {
      return this.currentPage > 1;
    },
    hasNextPage() {
      return this.addresses.length === this.itemsPerPage;
    },
    prevQuery() {
      if (!this.hasPrevPage) return {};
      return {
        page: this.currentPage - 1,
      };
    },
    nextQuery() {
      if (!this.hasNextPage) return {};
      return {
        page: this.currentPage + 1,
      };
    },
  },
  methods: {
    async fetchRichList(page) {
      this.currentPage = page || this.currentPage;
      const offset = (this.currentPage - 1) * this.itemsPerPage;
      const query = `
       query RichList($limit: Int!, $offset: Int!) {
  allStates(
    filter: {and: {key: {startsWith: "currency.balances:", notLike: "%:%:%"}}}
    first: $limit
    offset: $offset
    orderBy: VALUE_DESC
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

      const response = await axios.post(`${this.blockchain.rpc}/graphql`, {
        query,
        variables
      });

      // Assuming response data structure as { data: { allStates: { edges: [...] } } }
      const edges = response.data.data.allStates.edges;
      this.addresses = edges
        .map(edge => edge.node)
        
        .map(node => {
          // Extract the address part from the key
          const address = node.key.split(':')[1];
          return {
            address,
            // balance needs to be formated to 8 decimal places from the float value
            balance:  typeof node.value === 'number' ? node.value.toFixed(8) : node.value
          };
        });
    },
  },
  async mounted() {
    await this.fetchRichList();
  },
  watch: {
    '$route': {
      immediate: true,
      handler() {
        const page = this.$route.query.page ? parseInt(this.$route.query.page) : 1;
        this.fetchRichList(page);
      }
    }
  }
}
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
