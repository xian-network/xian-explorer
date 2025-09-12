<template>
  <div class="modern-page-transactions">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Transactions</h1>
        <p class="page-description">
          Latest transactions on the Xian blockchain. View transaction details, fees, and execution results.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="content-container">
        <!-- Table Controls -->
        <div class="table-controls">
          <div class="pagination-controls">
            <router-link 
              v-if="hasPrevPage"
              :to="{ path: '/txs', query: prevQuery }" 
              class="nav-button prev-button"
            >
              <i class="material-icons">chevron_left</i>
              Previous
            </router-link>
            <router-link 
              v-if="hasNextPage"
              :to="{ path: '/txs', query: nextQuery }" 
              class="nav-button next-button"
            >
              Next
              <i class="material-icons">chevron_right</i>
            </router-link>
          </div>
          <div class="page-info">
            <span v-if="transactions.length > 0">Showing {{ transactions.length }} transactions</span>
          </div>
          <div class="json-link" v-if="jsonUrl">
            <a :href="jsonUrl" target="_blank" class="json-button">
              <i class="material-icons">code</i>
              JSON
            </a>
          </div>
        </div>

        <!-- Transactions Table -->
        <div class="table-container" v-if="transactions.length > 0">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Transaction Hash</th>
                <th>Contract</th>
                <th>Function</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in transactions" :key="tx.hash" class="table-row">
                <td class="time-cell">
                  <div class="time-display">
                    <div class="time-main">{{ tx.formattedTime }}</div>
                    <div class="time-ago">{{ getTimeAgo(tx.timestamp) }}</div>
                  </div>
                </td>
                
                <td class="hash-cell">
                  <div class="hash-display">
                    <router-link :to="`/tx/${tx.hash}`" class="tx-link">
                      <div class="hash-text">{{ shortenHash(tx.hash) }}</div>
                    </router-link>
                    <button class="copy-btn" @click="copyToClipboard(tx.hash)">
                      <i class="material-icons">content_copy</i>
                    </button>
                  </div>
                </td>
                
                <td class="contract-cell">
                  <div class="contract-display">
                    <div class="contract-name">{{ shortenText(tx.contract) }}</div>
                    <div v-if="getContractType(tx.contract)" class="contract-type">{{ getContractType(tx.contract) }}</div>
                  </div>
                </td>
                
                <td class="function-cell">
                  <div class="function-display">
                    <div class="function-name">{{ shortenText(tx.function) }}</div>
                  </div>
                </td>
                
                <td class="fee-cell">
                  <div class="fee-display">
                    <div class="xian-fee">{{ tx.feeXian }} XIAN</div>
                    <div class="stamps">{{ num.prettyInt(tx.stamps) }} stamps</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading transactions...</p>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <i class="material-icons">receipt</i>
          </div>
          <h3>No transactions found</h3>
          <p>Unable to load transaction data at this time.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import moment from "moment";
import num from "../scripts/num";

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
    getTimeAgo(timestamp) {
      return moment.utc(timestamp).fromNow();
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
          const timestamp = Number(node.blockTime) / 1e6; // Convert microseconds to milliseconds
          return {
            hash: node.hash,
            blockHeight: node.blockHeight,
            contract: node.contract,
            function: node.function,
            stamps: node.stamps,
            feeXian,
            timestamp: timestamp,
            formattedTime: moment.utc(timestamp).local().format('MMM D, YYYY [at] h:mm A')
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

<style lang="stylus" scoped>
.modern-page-transactions
  min-height calc(100vh - 72px)
  background linear-gradient(135deg, #0f1419 0%, #1a2332 100%)
  color #ffffff

.page-header
  background linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)
  border-bottom 1px solid rgba(255, 255, 255, 0.1)
  padding 3rem 0

.header-content
  max-width 1200px
  margin 0 auto
  padding 0 2rem

.page-title
  font-size 3rem
  font-weight 700
  margin 0 0 1rem 0
  background linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)
  -webkit-background-clip text
  -webkit-text-fill-color transparent
  background-clip text

.page-description
  font-size 1.125rem
  color rgba(255, 255, 255, 0.7)
  margin 0 auto
  max-width 600px
  text-align center

.main-content
  padding 2rem 0

.content-container
  max-width 1200px
  margin 0 auto
  padding 0 2rem

.table-controls
  display flex
  justify-content space-between
  align-items center
  margin-bottom 2rem
  flex-wrap wrap
  gap 1rem

.pagination-controls
  display flex
  gap 0.5rem

.nav-button
  display flex
  align-items center
  gap 0.5rem
  padding 0.75rem 1.5rem
  background rgba(20, 184, 166, 0.1)
  border 1px solid rgba(20, 184, 166, 0.3)
  border-radius 8px
  color #14b8a6
  text-decoration none
  font-weight 500
  transition all 0.2s ease
  
  &:hover
    background rgba(20, 184, 166, 0.2)
    border-color rgba(20, 184, 166, 0.5)
    transform translateY(-1px)

.page-info
  color rgba(255, 255, 255, 0.7)
  font-size 0.9rem

.json-link
  .json-button
    display flex
    align-items center
    gap 0.5rem
    padding 0.75rem 1.5rem
    background rgba(59, 130, 246, 0.1)
    border 1px solid rgba(59, 130, 246, 0.3)
    border-radius 8px
    color #3b82f6
    text-decoration none
    font-weight 500
    transition all 0.2s ease
    
    &:hover
      background rgba(59, 130, 246, 0.2)
      border-color rgba(59, 130, 246, 0.5)
      transform translateY(-1px)

.table-container
  background rgba(255, 255, 255, 0.05)
  border-radius 12px
  overflow hidden
  border 1px solid rgba(255, 255, 255, 0.1)

.modern-table
  width 100%
  border-collapse collapse

  thead
    background rgba(255, 255, 255, 0.1)
    
    th
      padding 1.5rem 2rem
      text-align left
      font-weight 600
      font-size 0.875rem
      text-transform uppercase
      letter-spacing 0.05em
      color rgba(255, 255, 255, 0.8)
      border-bottom 1px solid rgba(255, 255, 255, 0.1)

  tbody
    .table-row
      border-bottom 1px solid rgba(255, 255, 255, 0.05)
      transition all 0.2s ease
      
      &:hover
        background rgba(255, 255, 255, 0.05)
      
      &:last-child
        border-bottom none

      td
        padding 1.5rem 2rem
        vertical-align middle

.time-cell
  width 180px

.time-display
  .time-main
    font-size 0.95rem
    color #ffffff
    font-weight 500
    margin-bottom 0.25rem
  
  .time-ago
    font-size 0.8rem
    color rgba(255, 255, 255, 0.6)

.hash-cell
  width 200px

.hash-display
  display flex
  align-items center
  gap 1rem
  
  .tx-link
    text-decoration none
    color inherit
    
    &:hover .hash-text
      color #14b8a6
  
  .hash-text
    font-family 'Monaco', 'Menlo', 'Ubuntu Mono', monospace
    font-size 0.85rem
    color rgba(255, 255, 255, 0.8)
    transition color 0.2s ease
  
  .copy-btn
    background rgba(255, 255, 255, 0.1)
    border 1px solid rgba(255, 255, 255, 0.2)
    border-radius 6px
    padding 0.5rem
    color rgba(255, 255, 255, 0.7)
    cursor pointer
    transition all 0.2s ease
    
    &:hover
      background rgba(255, 255, 255, 0.2)
      color #ffffff
      transform scale(1.05)
    
    i
      font-size 1rem

.contract-cell
  width 150px

.contract-display
  .contract-name
    font-size 0.9rem
    color #ffffff
    font-weight 500
    margin-bottom 0.25rem
  
  .contract-type
    font-size 0.75rem
    color rgba(255, 255, 255, 0.6)
    text-transform uppercase
    letter-spacing 0.05em

.function-cell
  width 120px

.function-display
  .function-name
    font-size 0.9rem
    color rgba(255, 255, 255, 0.8)
    font-weight 500

.fee-cell
  width 120px

.fee-display
  .xian-fee
    font-size 0.95rem
    color #14b8a6
    font-weight 600
    margin-bottom 0.25rem
  
  .stamps
    font-size 0.8rem
    color rgba(255, 255, 255, 0.6)

.loading-state
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  color rgba(255, 255, 255, 0.7)
  
  .loading-spinner
    width 40px
    height 40px
    border 3px solid rgba(255, 255, 255, 0.1)
    border-top 3px solid #14b8a6
    border-radius 50%
    animation spin 1s linear infinite
    margin-bottom 1rem
  
  p
    font-size 1.1rem
    margin 0

.empty-state
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  color rgba(255, 255, 255, 0.7)
  text-align center
  
  .empty-icon
    margin-bottom 1.5rem
    
    i
      font-size 3rem
      color rgba(255, 255, 255, 0.3)
  
  h3
    font-size 1.5rem
    color #ffffff
    margin 0 0 0.5rem 0
  
  p
    font-size 1rem
    margin 0
    opacity 0.8

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)
</style>