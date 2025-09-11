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
        
        .modern-table
          .table-header-row
            .table-cell.name-col Contract Name
            .table-cell.date-col Submission Date
            .table-cell.type-col Type
            .table-cell.actions-col Actions
          
          .table-row(v-for="contract in contracts" :key="contract.name")
            .table-cell.name-col
              .contract-display
                router-link.contract-link(:to="`/contracts/${contract.name}`")
                  .contract-name {{ contract.name }}
                button.copy-btn(@click="copyToClipboard(contract.name)")
                  i.material-icons content_copy
            
            .table-cell.date-col
              .date-display
                .date-main {{ contract.submissionDate }}
                .date-ago {{ getTimeAgo(contract.submissionDate) }}
            
            .table-cell.type-col
              .type-display
                .contract-type(:class="getContractTypeClass(contract.name)") {{ getContractType(contract.name) }}
            
            .table-cell.actions-col
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

.modern-table
  .table-header-row
    display grid
    grid-template-columns 1fr 200px 120px 120px
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
      grid-template-columns 1fr 180px 100px 100px
      gap 0.75rem
    
    @media (max-width: 768px)
      grid-template-columns 1fr 150px 80px 80px
      gap 0.5rem
      padding 1rem

  .table-row
    display grid
    grid-template-columns 1fr 200px 120px 120px
    gap 1rem
    padding 1rem 1.5rem
    border-bottom 1px solid var(--border-color)
    transition all 0.2s ease
    
    @media (max-width: 1024px)
      grid-template-columns 1fr 180px 100px 100px
      gap 0.75rem
    
    @media (max-width: 768px)
      grid-template-columns 1fr 150px 80px 80px
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

.contract-display
  display flex
  align-items center
  gap 0.5rem
  min-width 0
  
  .contract-link
    text-decoration none
    color var(--primary)
    font-weight 600
    transition color 0.2s ease
    min-width 0
    
    &:hover
      color var(--primary-light)
      text-decoration underline
    
    .contract-name
      font-family var(--font-mono)
      font-size 0.9rem
      overflow hidden
      text-overflow ellipsis
      white-space nowrap
      
      @media (max-width: 768px)
        font-size 0.8rem
  
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

.date-display
  .date-main
    font-size 0.85rem
    color var(--text-primary)
    margin-bottom 0.25rem
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .date-ago
    font-size 0.7rem
    color var(--text-dim)

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