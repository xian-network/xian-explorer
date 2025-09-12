<template>
  <div class="modern-page-contracts">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Smart Contracts</h1>
        <p class="page-description">
          Deployed smart contracts on the Xian blockchain. Explore contract details, code, and interactions.
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
              :to="{ path: '/contracts', query: prevQuery }" 
              class="nav-button prev-button"
            >
              <i class="material-icons">chevron_left</i>
              Previous
            </router-link>
            <router-link 
              v-if="hasNextPage"
              :to="{ path: '/contracts', query: nextQuery }" 
              class="nav-button next-button"
            >
              Next
              <i class="material-icons">chevron_right</i>
            </router-link>
          </div>
          <div class="page-info">
            <span v-if="contracts.length > 0">Showing {{ contracts.length }} contracts</span>
          </div>
          <div class="json-link" v-if="jsonUrl">
            <a :href="jsonUrl" target="_blank" class="json-button">
              <i class="material-icons">code</i>
              JSON
            </a>
          </div>
        </div>

        <!-- Contracts Table -->
        <div class="table-container" v-if="contracts.length > 0">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Contract Name</th>
                <th>Submission Date</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="contract in contracts" :key="contract.name" class="table-row">
                <td class="name-cell">
                  <div class="contract-display">
                    <router-link :to="`/contracts/${contract.name}`" class="contract-link">
                      <div class="contract-name">{{ contract.name }}</div>
                    </router-link>
                    <button class="copy-btn" @click="copyToClipboard(contract.name)">
                      <i class="material-icons">content_copy</i>
                    </button>
                  </div>
                </td>
                
                <td class="date-cell">
                  <div class="date-display">
                    <div class="date-main">{{ contract.submissionDate }}</div>
                    <div class="date-ago">{{ getTimeAgo(contract.created) }}</div>
                  </div>
                </td>
                
                <td class="type-cell">
                  <div class="type-display">
                    <div class="contract-type" :class="getContractTypeClass(contract.name)">{{ getContractType(contract.name) }}</div>
                  </div>
                </td>
                
                <td class="actions-cell">
                  <div class="actions-display">
                    <router-link :to="`/contracts/${contract.name}`" class="view-button">
                      <i class="material-icons">visibility</i>
                      View
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading contracts...</p>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <i class="material-icons">description</i>
          </div>
          <h3>No contracts found</h3>
          <p>Unable to load contract data at this time.</p>
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
  name: "modern-page-contracts",
  data() {
    return {
      contracts: [],
      jsonUrl: "",
      num: num,
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
      offset: 0,
      loading: true
    };
  },
  computed: {
    ...mapGetters([
      "blockchain",
    ]),
    hasPrevPage() {
      return this.offset > 0;
    },
    hasNextPage() {
      return this.contracts.length === this.itemsPerPage;
    },
    prevQuery() {
      const newOffset = Math.max(this.offset - this.itemsPerPage, 0);
      return {
        offset: newOffset,
      };
    },
    nextQuery() {
      const newOffset = this.offset + this.itemsPerPage;
      return {
        offset: newOffset,
      };
    },
  },
  methods: {
    getTimeAgo(dateString) {
      return moment.utc(dateString).fromNow();
    },
    getContractType(contractName) {
      if (contractName.includes('dex')) return 'DEX';
      if (contractName.includes('staking')) return 'Staking';
      if (contractName === 'currency') return 'Currency';
      if (contractName.includes('usdc') || contractName.includes('token')) return 'Token';
      if (contractName.includes('farm')) return 'Farming';
      if (contractName.includes('lotto')) return 'Lottery';
      if (contractName.includes('multi')) return 'Multi';
      if (contractName.includes('test')) return 'Test';
      return 'Contract';
    },
    getContractTypeClass(contractName) {
      const type = this.getContractType(contractName);
      return {
        'type-dex': type === 'DEX',
        'type-staking': type === 'Staking',
        'type-currency': type === 'Currency',
        'type-token': type === 'Token',
        'type-farming': type === 'Farming',
        'type-lottery': type === 'Lottery',
        'type-multi': type === 'Multi',
        'type-test': type === 'Test',
        'type-contract': type === 'Contract'
      };
    },
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    },
    async fetchContracts(offset = 0) {
      this.loading = true;
      try {
        this.offset = parseInt(offset, 10) || 0;

        const query = `
          query MyQuery {
            allContracts(offset: ${this.offset}, first: ${this.itemsPerPage}, orderBy: CREATED_DESC) {
              nodes {
                name
                created
              }
            }
          }
        `;

        this.jsonUrl = `${this.blockchain.rpc}/graphql`;

        const response = await axios.post(this.jsonUrl, {
          query: query
        });

        const contractsData = (response.data && response.data.data && response.data.data.allContracts && response.data.data.allContracts.nodes) || [];

        this.contracts = contractsData.map((contract) => {
          return {
            name: contract.name,
            created: contract.created,
            submissionDate: moment.utc(contract.created).local().format('MMM D, YYYY [at] h:mm A'),
          };
        });
      } catch (error) {
        console.error("Error fetching contracts:", error);
        this.contracts = [];
      } finally {
        this.loading = false;
      }
    },
    handlePageChange(offset) {
      this.$router.push({ path: '/contracts', query: { offset } });
    },
  },
  watch: {
    '$route': {
      immediate: true,
      handler(newRoute) {
        let offset = newRoute.query.offset || 0;
        this.fetchContracts(offset);
      }
    }
  },
}
</script>

<style lang="stylus" scoped>
.modern-page-contracts
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
  background rgba(255, 255, 255, 0.1)
  color #ffffff
  text-decoration none
  border-radius 8px
  border 1px solid rgba(255, 255, 255, 0.2)
  transition all 0.2s ease
  font-weight 500

  &:hover
    background rgba(255, 255, 255, 0.2)
    border-color rgba(255, 255, 255, 0.3)
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
    background rgba(20, 184, 166, 0.2)
    color #14b8a6
    text-decoration none
    border-radius 8px
    border 1px solid rgba(20, 184, 166, 0.3)
    transition all 0.2s ease
    font-weight 500

    &:hover
      background rgba(20, 184, 166, 0.3)
      border-color rgba(20, 184, 166, 0.5)
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

.name-cell
  width 300px

.contract-display
  display flex
  align-items center
  gap 1rem
  
  .contract-link
    text-decoration none
    color inherit
    
    &:hover .contract-name
      color #14b8a6
  
  .contract-name
    font-family 'Monaco', 'Menlo', 'Ubuntu Mono', monospace
    font-size 0.9rem
    color rgba(255, 255, 255, 0.9)
    font-weight 500
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

.date-cell
  width 200px

.date-display
  .date-main
    font-size 0.95rem
    color #ffffff
    font-weight 500
    margin-bottom 0.25rem
  
  .date-ago
    font-size 0.8rem
    color rgba(255, 255, 255, 0.6)

.type-cell
  width 150px

.type-display
  .contract-type
    display inline-block
    padding 0.375rem 0.75rem
    border-radius 6px
    font-size 0.75rem
    font-weight 600
    text-transform uppercase
    letter-spacing 0.05em
    
    &.token
      background rgba(34, 197, 94, 0.2)
      color #22c55e
      border 1px solid rgba(34, 197, 94, 0.3)
    
    &.system
      background rgba(239, 68, 68, 0.2)
      color #ef4444
      border 1px solid rgba(239, 68, 68, 0.3)
    
    &.contract
      background rgba(59, 130, 246, 0.2)
      color #3b82f6
      border 1px solid rgba(59, 130, 246, 0.3)

.actions-cell
  width 120px

.actions-display
  .view-button
    display flex
    align-items center
    gap 0.5rem
    padding 0.5rem 1rem
    background rgba(20, 184, 166, 0.2)
    color #14b8a6
    text-decoration none
    border-radius 6px
    border 1px solid rgba(20, 184, 166, 0.3)
    font-size 0.875rem
    font-weight 500
    transition all 0.2s ease
    
    &:hover
      background rgba(20, 184, 166, 0.3)
      border-color rgba(20, 184, 166, 0.5)
      transform translateY(-1px)
    
    i
      font-size 1rem

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