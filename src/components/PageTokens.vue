<template lang="pug">
tm-page(title='Contracts')
  div(slot="menu"): tm-tool-bar
    router-link(:to="{ path: '/tokens', query: prevQuery }" v-if="hasPrevPage")
      i.material-icons chevron_left
      | Prev. Tokens
    router-link(:to="{ path: '/tokens', query: nextQuery }" v-if="hasNextPage")
      | Next Tokens
      i.material-icons chevron_right
    a(:href="jsonUrl" target="_blank") JSON

  table.ContractsTable
    thead
      th Token
      th Creation Date
    tbody
      tr(v-for="contract in contracts" :key="contract.name")
        td
          router-link(:to="`/tokens/${contract.name}`")
            | {{ contract.display }}
        td {{ contract.submissionDate }}
</template>

<script>
import axios from "axios";
import num from "../scripts/num";
import { mapGetters } from "vuex";
import { TmPage, TmToolBar } from "@tendermint/ui";

const maxItemsPerPage = 20;

export default {
  name: "page-tokens",
  components: {
    TmPage,
    TmToolBar
  },
  data() {
    return {
      contracts: [],
      jsonUrl: "",
      num: num,
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
      offset: 0,
    };
  },
 computed: {
  ...mapGetters([
    "blockchain",
  ]),
  hasPrevPage() {
    // Show "Prev" button only if the offset is greater than 0
    return this.offset > 0;
  },
  hasNextPage() {
    // Show "Next" button if the number of contracts equals the items per page (indicating there might be more)
    return this.contracts.length === this.itemsPerPage;
  },
  prevQuery() {
    // Calculate the previous offset, ensuring it doesn't go below 0
    const newOffset = Math.max(this.offset - this.itemsPerPage, 0);
    return {
      offset: newOffset,
    };
  },
  nextQuery() {
    // Increment the offset by the number of items per page
    const newOffset = this.offset + this.itemsPerPage;
    return {
      offset: newOffset,
    };
  },
},
methods: {
  async fetchContracts(offset = 0) {
    /* 1️⃣ remember paging info */
    this.offset = Number(offset) || 0;

    /* 2️⃣ first query – just the contracts we want */
    const contractListQuery = `
      query TokenContracts($first: Int!, $offset: Int!) {
        allContracts(
          first:  $first
          offset: $offset
          orderBy: CREATED_DESC
          filter: { xsc0001: { equalTo: true } }
        ) {
          nodes { name created }
        }
      }
    `;
    const { data } = await axios.post(
      `${this.blockchain.rpc}/graphql`,
      { query: contractListQuery, variables: {
          first: this.itemsPerPage, offset: this.offset
      }}
    );

    const nodes =
  (data &&
   data.data &&
   data.data.allContracts &&
   data.data.allContracts.nodes) || [];
    if (!nodes.length) { this.contracts = []; return; }

    /* 3️⃣ build the list of metadata keys we need */
    const metaKeys = [];
    nodes.forEach(({ name }) => {
      metaKeys.push(`${name}.metadata:token_name`);
      metaKeys.push(`${name}.metadata:token_symbol`);
    });

    /* 4️⃣ second query – pull the metadata in one call */
    const metaQuery = `
      query TokenMeta($keys:[String!]!) {
        allStates(filter:{ key:{ in:$keys } }) {
          edges { node { key value } }
        }
      }
    `;
    const metaResp = await axios.post(
      `${this.blockchain.rpc}/graphql`,
      { query: metaQuery, variables: { keys: metaKeys } }
    );
    const metaEdges =
  (metaResp &&
   metaResp.data &&
   metaResp.data.data &&
   metaResp.data.data.allStates &&
   metaResp.data.data.allStates.edges) || [];

    /* 5️⃣ build a lookup: { con_usdc: { token_name:'USDC', ... } } */
    const metaMap = {};
    metaEdges.forEach(({ node }) => {
      const [contractDotMeta, field] = node.key.split(":");
      const contract = contractDotMeta.replace(".metadata", "");
      if (!metaMap[contract]) metaMap[contract] = {};
      metaMap[contract][field] = node.value;
    });

    /* 6️⃣ final combine & format */
    this.contracts = nodes.map(c => {
      const m = metaMap[c.name] || {};
      const display =
        m.token_name
          ? `${m.token_name}${m.token_symbol ? " (" + m.token_symbol + ")" : ""}`
          : c.name;
      return {
        name: c.name,
        display,                                     // ← use in the table
        submissionDate: new Date(c.created).toLocaleString()
      };
    });
  },

  handlePageChange(newOffset) {
    this.$router.push({ path: "/tokens", query: { offset: newOffset } });
  }
},


watch: {
  '$route': {
    immediate: true,
    handler(newRoute) {
      // Parse the offset from the route, defaulting to 0 if not present
      let offset = newRoute.query.offset || 0;
      this.fetchContracts(offset);
    }
  }
},
}
</script>

<style lang="stylus">
.ContractsTable
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
