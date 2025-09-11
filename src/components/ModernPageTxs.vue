<template lang="pug">
.modern-page-transactions
  .page-header
    .container
      .page-title
        h1 Transactions
        p Latest transactions on the Xian blockchain
      
      .page-actions
        .pagination-controls(v-if="transactions.length > 0")
          router-link.btn.btn-secondary(:to="{ path: '/txs', query: prevQuery }" v-if="hasPrevPage")
            i.material-icons chevron_left
            span Previous
          router-link.btn.btn-secondary(:to="{ path: '/txs', query: nextQuery }" v-if="hasNextPage")
            span Next
            i.material-icons chevron_right
        
        a.btn.btn-outline(:href="jsonUrl" target="_blank" v-if="jsonUrl")
          i.material-icons code
          span JSON

  .page-content
    .container
      .transactions-table-container(v-if="transactions.length > 0")
        .table-header
          .table-info
            span Showing {{ transactions.length }} transactions
            span.page-info(v-if="currentPage > 1") (Page {{ currentPage }})
        
        .modern-table
          .table-header-row
            .table-cell.time-col Time
            .table-cell.hash-col Transaction Hash
            .table-cell.contract-col Contract
            .table-cell.function-col Function
            .table-cell.fee-col Fee (Stamps / XIAN)
          
          .table-row(v-for="tx in transactions" :key="tx.hash")
            .table-cell.time-col
              .time-display
                .time-main {{ tx.formattedTime }}
                .time-ago {{ getTimeAgo(tx.formattedTime) }}
            
            .table-cell.hash-col
              .hash-display
                router-link.tx-link(:to="`/tx/${tx.hash}`")
                  .hash-text {{ shortenHash(tx.hash) }}
                button.copy-btn(@click="copyToClipboard(tx.hash)")
                  i.material-icons content_copy
            
            .table-cell.contract-col
              .contract-display
                .contract-name {{ shortenText(tx.contract) }}
                .contract-type(v-if="getContractType(tx.contract)") {{ getContractType(tx.contract) }}
            
            .table-cell.function-col
              .function-display
                .function-name {{ shortenText(tx.function) }}
            
            .table-cell.fee-col
              .fee-display
                .stamps {{ num.prettyInt(tx.stamps) }}
                .xian-fee / {{ tx.feeXian }}

      .loading-state(v-else-if="loading")
        .loading-spinner
        p Loading transactions...

      .empty-state(v-else)
        .empty-icon
          i.material-icons receipt
        h3 No transactions found
        p Unable to load transaction data at this time.
</template>

<script>
import axios from "axios";
import moment from "moment";
import num from "../scripts/num";
import { decodeData } from "../scripts/tx";
import { mapGetters } from "vuex";

const maxItemsPerPage = 20;

export default {
  name: "modern-page-transactions",
  data() {
    return {
      transactions: [],
      jsonUrl: "",
      num: num,
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
      stampRate: null,
      loading: true
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
    shortenHash(hash) {
      return hash ? `${hash.substring(0, 12)}...${hash.slice(-4)}` : "N/A";
    },
    shortenText(text) {
      return text.length > 20 ? `${text.substring(0, 20)}...` : text;
    },
    getTimeAgo(timeString) {
      return moment(timeString).fromNow();
    },
    getContractType(contract) {
      if (contract.includes('dex')) return 'DEX';
      if (contract.includes('staking')) return 'Staking';
      if (contract === 'currency') return 'Currency';
      if (contract.includes('usdc')) return 'Token';
      return null;
    },
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    },
    async fetchStampRate() {
      try {
        const resp = await fetch(
          this.blockchain.rpc + '/abci_query?path="/get/stamp_cost.S:value"'
        );
        const v = resp.ok ? (await resp.json()).result.response.value : "AA==";
        this.stampRate = v === "AA==" ? null : parseInt(atob(v), 10);
      } catch (e) {
        console.error("stamp‑rate fetch failed", e);
      }
    },
    async fetchTransactions(page) {
      this.loading = true;
      try {
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

        const response = await axios.post(this.jsonUrl, {
          query,
          variables
        });

        this.transactions = response.data.data.allTransactions.edges.map(({ node }) => {
          const feeXian = this.stampRate
            ? (node.stamps / this.stampRate).toFixed(3)
            : "—";
          return {
            hash: node.hash,
            blockHeight: node.blockHeight,
            contract: node.contract,
            function: node.function,
            stamps: node.stamps,
            feeXian,
            formattedTime: new Date(Number(node.blockTime) / 1e6).toLocaleString()
          };
        });
      } catch (error) {
        console.error('Error fetching transactions:', error);
        this.transactions = [];
      } finally {
        this.loading = false;
      }
    },
  },
  async mounted() {
    await this.fetchStampRate();
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
.modern-page-transactions
  background var(--bg-app)

.page-header
  background linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)
  padding 3rem 0 2rem
  border-bottom 1px solid var(--border-color)
  
  .container
    display flex
    justify-content space-between
    align-items flex-end
    gap 2rem
    
    @media (max-width: 768px)
      flex-direction column
      align-items flex-start
      gap 1.5rem

.page-title
  h1
    font-size 2.5rem
    font-weight 700
    color var(--text-primary)
    margin 0 0 0.5rem
    
    @media (max-width: 768px)
      font-size 2rem
  
  p
    font-size 1.1rem
    color var(--text-secondary)
    margin 0
    opacity 0.9

.page-actions
  display flex
  align-items center
  gap 1rem
  
  @media (max-width: 768px)
    width 100%
    justify-content space-between

.pagination-controls
  display flex
  gap 0.5rem

.page-content
  padding 2rem 0

.transactions-table-container
  background var(--bg-card)
  border-radius var(--border-radius-lg)
  border 1px solid var(--border-color)
  overflow hidden
  box-shadow var(--shadow-card)

.table-header
  padding 1.5rem
  border-bottom 1px solid var(--border-color)
  background var(--bg-card-header)
  
  .table-info
    display flex
    align-items center
    gap 1rem
    font-size 0.9rem
    color var(--text-secondary)
    
    .page-info
      color var(--text-dim)

.modern-table
  .table-header-row
    display grid
    grid-template-columns 180px 200px 150px 150px 140px
    gap 1rem
    padding 1rem 1.5rem
    background var(--bg-table-header)
    border-bottom 1px solid var(--border-color)
    font-weight 600
    font-size 0.85rem
    text-transform uppercase
    letter-spacing 0.5px
    color var(--text-secondary)
    
    @media (max-width: 1024px)
      grid-template-columns 150px 180px 120px 120px 120px
      gap 0.75rem
    
    @media (max-width: 768px)
      grid-template-columns 120px 150px 100px 100px 100px
      gap 0.5rem
      padding 1rem

  .table-row
    display grid
    grid-template-columns 180px 200px 150px 150px 140px
    gap 1rem
    padding 1rem 1.5rem
    border-bottom 1px solid var(--border-color)
    transition all 0.2s ease
    
    @media (max-width: 1024px)
      grid-template-columns 150px 180px 120px 120px 120px
      gap 0.75rem
    
    @media (max-width: 768px)
      grid-template-columns 120px 150px 100px 100px 100px
      gap 0.5rem
      padding 1rem
    
    &:hover
      background var(--bg-hover)
    
    &:last-child
      border-bottom none

.table-cell
  display flex
  align-items center
  min-width 0

.time-display
  .time-main
    font-size 0.85rem
    color var(--text-primary)
    margin-bottom 0.25rem
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .time-ago
    font-size 0.7rem
    color var(--text-dim)

.hash-display
  display flex
  align-items center
  gap 0.5rem
  min-width 0
  
  .tx-link
    text-decoration none
    color var(--primary)
    font-weight 600
    transition color 0.2s ease
    min-width 0
    
    &:hover
      color var(--primary-light)
      text-decoration underline
    
    .hash-text
      font-family var(--font-mono)
      font-size 0.85rem
      overflow hidden
      text-overflow ellipsis
      white-space nowrap
      
      @media (max-width: 768px)
        font-size 0.75rem
  
  .copy-btn
    background none
    border none
    color var(--text-dim)
    cursor pointer
    padding 0.25rem
    border-radius var(--border-radius)
    transition all 0.2s ease
    flex-shrink 0
    
    &:hover
      color var(--primary)
      background var(--bg-hover)
    
    i
      font-size 0.9rem

.contract-display
  .contract-name
    font-size 0.85rem
    color var(--text-primary)
    margin-bottom 0.25rem
    font-family var(--font-mono)
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .contract-type
    font-size 0.7rem
    color var(--primary)
    background var(--primary-bg)
    padding 0.125rem 0.375rem
    border-radius var(--border-radius-sm)
    text-transform uppercase
    font-weight 600

.function-display
  .function-name
    font-size 0.85rem
    color var(--text-primary)
    font-family var(--font-mono)
    
    @media (max-width: 768px)
      font-size 0.75rem

.fee-display
  text-align right
  
  .stamps
    font-size 0.85rem
    color var(--text-primary)
    font-weight 600
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .xian-fee
    font-size 0.75rem
    color var(--text-dim)
    margin-left 0.25rem

.loading-state
  text-align center
  padding 4rem 2rem
  color var(--text-secondary)
  
  .loading-spinner
    width 40px
    height 40px
    border 3px solid var(--border-color)
    border-top 3px solid var(--primary)
    border-radius 50%
    animation spin 1s linear infinite
    margin 0 auto 1rem
  
  p
    margin 0
    font-size 1.1rem

.empty-state
  text-align center
  padding 4rem 2rem
  color var(--text-secondary)
  
  .empty-icon
    margin-bottom 1rem
    
    i
      font-size 3rem
      color var(--text-dim)
  
  h3
    margin 0 0 0.5rem
    color var(--text-primary)
  
  p
    margin 0
    font-size 1rem

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)
</style>