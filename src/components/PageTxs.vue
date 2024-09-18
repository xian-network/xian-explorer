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
      th Timestamp
      th Transaction Hash
      th Stamps Used
    tbody
      tr(v-for="tx in transactions" :key="tx.hash")
        td {{ num.prettyInt(tx.height) }}
        td {{ tx.timestamp }}
        td
          router-link(:to="`/tx/${tx.hash}`")
            | {{ tx.hash }}
        td {{ num.prettyInt(tx.gasUsed) }}
</template>


<script>
import axios from "axios";
import num from "../scripts/num"
import { decodeTx, decodeData } from "../scripts/tx"
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
      // Assuming we don't know the total number of pages, this might need to be adjusted based on actual API response
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
      let block_timestamps = {};
      const queryParams = new URLSearchParams({
        query: '"tx.height>0"',
        per_page: this.itemsPerPage.toString(),
        order_by: '"desc"',
        page: this.currentPage.toString(),
      }).toString();
      this.jsonUrl = `https://testnet.xian.org/tx_search?${queryParams}`;
      const response = await axios.get(`https://testnet.xian.org/tx_search?${queryParams}`);
        this.transactions = [];
        for (let i = 0; i < response.data.result.txs.length; i++) {
          
          try {
            let tx = response.data.result.txs[i];
            if (block_timestamps[tx.height] === undefined) {
              block_timestamps[tx.height] = await this.fetchBlockTimestamp(tx.height);
            }
            this.transactions.push({
              hash: tx.hash,
              height: tx.height,
              gasUsed: decodeData(tx.tx_result.data).stamps_used,
              timestamp: block_timestamps[tx.height]
            });
          } catch (e) {
            console.error(e);
          }
        }
    },
    async fetchBlockTimestamp(height) {
      const response = await axios.get(`${this.blockchain.rpc}/block?height=${height}`);
      let newDate = new Date(response.data.result.block.header.time);
      return newDate.toLocaleString();
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
