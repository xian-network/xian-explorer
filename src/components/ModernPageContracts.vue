<template lang="pug">
.modern-page-contracts
  .page-header
    .container
      .page-title
        h1 Smart Contracts
        p Deployed smart contracts on the Xian blockchain
      
      .page-actions
        .pagination-controls(v-if="contracts.length > 0")
          router-link.btn.btn-secondary(:to="{ path: '/contracts', query: prevQuery }" v-if="hasPrevPage")
            i.material-icons chevron_left
            span Previous
          router-link.btn.btn-secondary(:to="{ path: '/contracts', query: nextQuery }" v-if="hasNextPage")
            span Next
            i.material-icons chevron_right
        
        a.btn.btn-outline(:href="jsonUrl" target="_blank" v-if="jsonUrl")
          i.material-icons code
          span JSON

  .page-content
    .container
      .contracts-table-container(v-if="contracts.length > 0")
        .table-header
          .table-info
            span Showing {{ contracts.length }} contracts
            span.page-info(v-if="offset > 0") (Offset {{ offset }})
        
        .table-container
          table.modern-table
            thead
              tr
                th Contract Name
                th Submission Date
                th Type
                th Actions
            
            tbody
              tr.table-row(v-for="contract in contracts" :key="contract.name")
                td.name-cell
                  .contract-display
                    router-link.contract-link(:to="`/contracts/${contract.name}`")
                      .contract-name {{ contract.name }}
                    button.copy-btn(@click="copyToClipboard(contract.name)")
                      i.material-icons content_copy
                
                td.date-cell
                  .date-display
                    .date-main {{ contract.submissionDate }}
                    .date-ago {{ getTimeAgo(contract.submissionDate) }}
                
                td.type-cell
                  .type-display
                    .contract-type(:class="getContractTypeClass(contract.name)") {{ getContractType(contract.name) }}
                
                td.actions-cell
                  .actions-display
                    router-link.btn.btn-sm.btn-primary(:to="`/contracts/${contract.name}`")
                      i.material-icons visibility
                      span View

      .loading-state(v-else-if="loading")
        .loading-spinner
        p Loading contracts...

      .empty-state(v-else)
        .empty-icon
          i.material-icons description
        h3 No contracts found
        p Unable to load contract data at this time.
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
      return moment(dateString).fromNow();
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

        this.contracts = contractsData.map(function(contract) {
          return {
            name: contract.name,
            submissionDate: new Date(contract.created).toLocaleString(),
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

<style lang="stylus">
.modern-page-contracts
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

.contracts-table-container
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
  min-width 0

.date-cell
  width 200px

.type-cell
  width 120px

.actions-cell
  width 120px

.contract-display
  display flex
  align-items center
  gap 0.5rem
  min-width 0
  
  .contract-link
    text-decoration none
    color #14b8a6
    font-weight 600
    transition color 0.2s ease
    min-width 0
    
    &:hover
      color #10b981
      text-decoration underline
    
    .contract-name
      font-family 'JetBrains Mono', monospace
      font-size 0.9rem
      overflow hidden
      text-overflow ellipsis
      white-space nowrap
      
      @media (max-width: 768px)
        font-size 0.8rem
  
  .copy-btn
    background none
    border none
    color rgba(255, 255, 255, 0.5)
    cursor pointer
    padding 0.25rem
    border-radius 4px
    transition all 0.2s ease
    flex-shrink 0
    
    &:hover
      color #14b8a6
      background rgba(255, 255, 255, 0.05)
    
    i
      font-size 0.9rem

.date-display
  display flex
  flex-direction column
  gap 0.25rem

  .date-main
    font-size 0.85rem
    color #ffffff
    font-weight 500
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .date-ago
    font-size 0.7rem
    color rgba(255, 255, 255, 0.5)

.type-display
  .contract-type
    font-size 0.7rem
    padding 0.25rem 0.5rem
    border-radius var(--border-radius-sm)
    text-transform uppercase
    font-weight 600
    text-align center
    
    &.type-dex
      color var(--primary)
      background var(--primary-bg)
    
    &.type-staking
      color #10b981
      background rgba(16, 185, 129, 0.1)
    
    &.type-currency
      color #f59e0b
      background rgba(245, 158, 11, 0.1)
    
    &.type-token
      color #8b5cf6
      background rgba(139, 92, 246, 0.1)
    
    &.type-farming
      color #22c55e
      background rgba(34, 197, 94, 0.1)
    
    &.type-lottery
      color #ec4899
      background rgba(236, 72, 153, 0.1)
    
    &.type-multi
      color #06b6d4
      background rgba(6, 182, 212, 0.1)
    
    &.type-test
      color #6b7280
      background rgba(107, 114, 128, 0.1)
    
    &.type-contract
      color var(--text-secondary)
      background var(--bg-secondary)

.actions-display
  .btn-sm
    padding 0.375rem 0.75rem
    font-size 0.75rem
    
    i
      font-size 0.9rem
      margin-right 0.25rem

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