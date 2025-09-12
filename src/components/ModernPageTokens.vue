<template>
  <div class="modern-page-tokens">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Tokens</h1>
        <p class="page-description">
          Explore all tokens deployed on the Xian blockchain. View token details, creation dates, and contract information.
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
              :to="{ path: '/tokens', query: prevQuery }" 
              class="nav-button prev-button"
            >
              <i class="material-icons">chevron_left</i>
              Previous
            </router-link>
            <router-link 
              v-if="hasNextPage"
              :to="{ path: '/tokens', query: nextQuery }" 
              class="nav-button next-button"
            >
              Next
              <i class="material-icons">chevron_right</i>
            </router-link>
          </div>
          <a :href="jsonUrl" target="_blank" class="json-link">
            <i class="material-icons">code</i>
            JSON
          </a>
        </div>

        <!-- Tokens Table -->
        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Creation Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="contract in contracts" :key="contract.name" class="table-row">
                <td class="token-cell">
                  <router-link :to="`/tokens/${contract.name}`" class="token-link">
                    <div class="token-info">
                      <span class="token-name">{{ contract.display }}</span>
                      <span class="token-contract">{{ contract.name }}</span>
                    </div>
                  </router-link>
                </td>
                <td class="date-cell">
                  <div class="date-info">
                    <span class="date-primary">{{ formatDate(contract.submissionDate) }}</span>
                    <span class="date-relative">{{ getRelativeTime(contract.submissionDate) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading tokens...</p>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && contracts.length === 0" class="empty-state">
          <i class="material-icons">token</i>
          <h3>No tokens found</h3>
          <p>There are no tokens to display at the moment.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import moment from "moment";
import { mapGetters } from "vuex";

const maxItemsPerPage = 20;

export default {
  name: "modern-page-tokens",
  data() {
    return {
      contracts: [],
      jsonUrl: "",
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
      offset: 0,
      loading: true,
    };
  },
  computed: {
    ...mapGetters([
      "blockchain"
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
    }
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
  methods: {
    async fetchContracts(offset = 0) {
      this.loading = true;
      this.offset = Number(offset) || 0;

      try {
        // First query - get the contracts we want
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
        if (!nodes.length) { 
          this.contracts = []; 
          this.loading = false;
          return; 
        }

        // Build the list of metadata keys we need
        const metaKeys = [];
        nodes.forEach(({ name }) => {
          metaKeys.push(`${name}.metadata:token_name`);
          metaKeys.push(`${name}.metadata:token_symbol`);
        });

        // Second query - pull the metadata in one call
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

        // Build a lookup: { con_usdc: { token_name:'USDC', ... } }
        const metaMap = {};
        metaEdges.forEach(({ node }) => {
          const [contractDotMeta, field] = node.key.split(":");
          const contract = contractDotMeta.replace(".metadata", "");
          if (!metaMap[contract]) metaMap[contract] = {};
          metaMap[contract][field] = node.value;
        });

        // Final combine & format
        this.contracts = nodes.map(c => {
          const m = metaMap[c.name] || {};
          const display =
            m.token_name
              ? `${m.token_name}${m.token_symbol ? " (" + m.token_symbol + ")" : ""}`
              : c.name;
          return {
            name: c.name,
            display,
            submissionDate: new Date(c.created).toLocaleString()
          };
        });

        // Set JSON URL for debugging
        this.jsonUrl = `${this.blockchain.rpc}/graphql?query=${encodeURIComponent(contractListQuery)}`;
        
      } catch (error) {
        console.error("Error fetching tokens:", error);
        this.contracts = [];
      } finally {
        this.loading = false;
      }
    },

    handlePageChange(newOffset) {
      this.$router.push({ path: "/tokens", query: { offset: newOffset } });
    },

    async fetchTokens() {
      // Legacy method - redirect to fetchContracts
      await this.fetchContracts(this.offset);
    },

    formatDate(dateString) {
      return moment(dateString).format('MMM D, YYYY [at] h:mm A');
    },

    getRelativeTime(dateString) {
      return moment(dateString).fromNow();
    }
  }
};
</script>

<style lang="stylus" scoped>
.modern-page-tokens
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
  gap 1rem

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

  .material-icons
    font-size 1.25rem

.json-link
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

.token-cell
  .token-link
    text-decoration none
    color inherit
    display block
    
    &:hover .token-name
      color #14b8a6

.token-info
  display flex
  flex-direction column
  gap 0.25rem

.token-name
  font-weight 600
  font-size 1rem
  color #ffffff
  transition color 0.2s ease

.token-contract
  font-size 0.875rem
  color rgba(255, 255, 255, 0.5)
  font-family 'JetBrains Mono', monospace

.date-cell
  .date-info
    display flex
    flex-direction column
    gap 0.25rem

.date-primary
  font-weight 500
  color #ffffff

.date-relative
  font-size 0.875rem
  color rgba(255, 255, 255, 0.5)

.loading-container
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  text-align center

.loading-spinner
  width 40px
  height 40px
  border 3px solid rgba(20, 184, 166, 0.3)
  border-top 3px solid #14b8a6
  border-radius 50%
  animation spin 1s linear infinite
  margin-bottom 1rem

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)

.empty-state
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  text-align center
  color rgba(255, 255, 255, 0.6)

  .material-icons
    font-size 4rem
    margin-bottom 1rem
    color rgba(255, 255, 255, 0.3)

  h3
    font-size 1.5rem
    margin 0 0 0.5rem 0
    color rgba(255, 255, 255, 0.8)

  p
    margin 0
    font-size 1rem

// Responsive Design
@media (max-width: 768px)
  .page-header
    padding 2rem 0

  .header-content
    padding 0 1rem

  .page-title
    font-size 2rem

  .content-container
    padding 0 1rem

  .table-controls
    flex-direction column
    align-items stretch

  .pagination-controls
    justify-content center

  .modern-table
    thead th
      padding 1rem
      font-size 0.75rem
    
    tbody td
      padding 1rem

  .token-info
    gap 0.125rem

  .token-name
    font-size 0.875rem

  .token-contract
    font-size 0.75rem
</style>