<template>
  <tm-page title="Transactions">
    <div slot="menu">
      <tm-tool-bar>
        <router-link :to="{ path: '/txs', query: prevQuery }" v-if="hasPrevPage">
          <i class="material-icons">chevron_left</i>
          Prev. Transactions
        </router-link>
        <router-link :to="{ path: '/txs', query: nextQuery }" v-if="hasNextPage">
          Next Transactions
          <i class="material-icons">chevron_right</i>
        </router-link>
        <a :href="jsonUrl" target="_blank">JSON</a>
      </tm-tool-bar>
    </div>

    <table class="BlocksTable">
      <thead>
        <th>Block Height</th>
        <th>Transaction Hash</th>
        <th>Stamps Used</th>
      </thead>
      <tbody>
        <tr v-for="tx in transactions" :key="tx.hash">
          <td>{{ tx.height }}</td>
          <td>
            <router-link :to="`/tx/${tx.hash}`">{{ tx.hash }}</router-link>
          </td>
          
          <td>{{ tx.gasUsed }}</td>
        </tr>
      </tbody>
    </table>
  </tm-page>
</template>

<script>
import axios from "axios";
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
      const queryParams = new URLSearchParams({
        query: '"tx.height>0"',
        per_page: this.itemsPerPage.toString(),
        order_by: '"desc"',
        page: this.currentPage.toString(),
      }).toString();
      this.jsonUrl = `https://testnet.xian.org/tx_search?${queryParams}`;

      try {
        const response = await axios.get(this.jsonUrl);
        this.transactions = response.data.result.txs.map(tx => ({
          hash: tx.hash,
          height: tx.height,
          gasUsed: tx.tx_result.gas_used,
        }));
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        this.transactions = [];
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
    font-weight bold
    color var(--dim)
    background var(--app-fg)
  tr
    &:hover
      background-color var(--hover-bg)
  th, td
    border-bottom 0.125rem solid var(--bc-dim)
    padding 0.5rem 1rem
</style>
