<template lang="pug">
  tm-page(title='Transactions')
    div(slot="menu"): tm-tool-bar
      router-link(:to="{ path: '/txs', query: prevQuery }" v-if="hasPrevPage")
        i.material-icons chevron_left
        | Prev. Transactions
      router-link(:to="{ path: '/txs', query: nextQuery }" v-if="hasNextPage")
        | Next Transactions
        i.material-icons chevron_right
      a(:href="jsonUrl" target="_blank") JSON

    table.BlocksTable
      thead
        th Block Height
        th Transaction Hash
        th Contract
        th Function
        th Stamps Used
      tbody
        tr(v-for="tx in transactions" :key="tx.hash")
         
          td {{ tx.blockHeight }}
          td
            router-link(:to="`/tx/${tx.hash}`")
              | {{ tx.hash }}
          td {{ tx.contract }}
          td {{ tx.function }}
          td {{ tx.stamps }}
</template>

<script>
import axios from "axios";
import num from "../scripts/num";
import { decodeData } from "../scripts/tx";
import { mapGetters } from "vuex";
import { TmPage, TmToolBar } from "@tendermint/ui";

const maxItemsPerPage = 20;

export default {
  name: "page-transactions",
  components: {
    TmPage,
    TmToolBar
  },
  data() {
    return {
      transactions: [],
      jsonUrl: "",
      num: num,
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
      return this.transactions.length === this.itemsPerPage;
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
    async fetchTransactions(page) {
      this.currentPage = page || this.currentPage;

      // GraphQL query to fetch transactions with pagination
      const query = `
        query MyQuery($offset: Int!, $limit: Int!) {
          allTransactions(
            first: $limit
            offset: $offset
            orderBy: BLOCK_HEIGHT_DESC
          ) {
            edges {
              node {
                blockTime
                blockHeight
                hash
                contract
                function
                stamps
              }
            }
          }
        }
      `;

      // Set JSON URL for the external link
      this.jsonUrl = `${this.blockchain.rpc}/graphql`;

      const variables = {
        offset: (this.currentPage - 1) * this.itemsPerPage,
        limit: this.itemsPerPage,
      };

      try {
        const response = await axios.post(this.jsonUrl, {
          query,
          variables
        });

        // Map transactions and format blockTime
        this.transactions = response.data.data.allTransactions.edges.map(edge => ({
          hash: edge.node.hash,
          blockHeight: edge.node.blockHeight,
          contract: edge.node.contract,
          function: edge.node.function,
          stamps: edge.node.stamps,
          formattedTime: new Date(Number(edge.node.blockTime) / 1e6).toLocaleString(),
        }));
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    },
  },
  async mounted() {
    await this.fetchTransactions();
  },
  watch: {
    '$route': {
      immediate: true,
      handler() {
        const page = this.$route.query.page ? parseInt(this.$route.query.page) : 1;
        this.fetchTransactions(page);
      }
    }
  },
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
