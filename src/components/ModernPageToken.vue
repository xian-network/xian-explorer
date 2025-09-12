<template>
  <div class="modern-page-token">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading token details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Token</h3>
      <p>{{ error }}</p>
      <button @click="fetchToken($route.params.contract)" class="retry-button">Try Again</button>
    </div>

    <!-- Token Not Found -->
    <div v-else-if="!contract.isToken" class="not-found-container">
      <div class="not-found-icon">🪙</div>
      <h3>Token Not Found</h3>
      <p>The token "{{ $route.params.contract }}" could not be found.</p>
    </div>

    <!-- Token Content -->
    <div v-else class="token-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content-inner">
          <div class="header-content">
            <div class="header-main">
              <h1 class="page-title">
                {{ tokenData.token_name || contract.name }}
                
              </h1>
              <p class="page-description">
                Token information, markets, and holder details
              </p>
            </div>
            
          </div>
        </div>
      </div>

      <!-- Token Content -->
      <div class="token-content-inner">
        <!-- Token Information -->
        <div class="token-info-section">
          <div class="info-card">
            <h3 class="card-title">Token Information</h3>
            <div class="card-content">
              <div class="info-row" v-if="tokenData.token_name">
                <span class="info-label">Name</span>
                <span class="info-value">{{ tokenData.token_name }}</span>
              </div>
              <div class="info-row" v-if="tokenData.token_symbol">
                <span class="info-label">Symbol</span>
                <span class="info-value token-symbol">{{ tokenData.token_symbol }}</span>
              </div>
              <div class="info-row" v-if="tokenData.token_website">
                <span class="info-label">Website</span>
                <a :href="tokenData.token_website" target="_blank" class="info-value website-link">
                  {{ tokenData.token_website }}
                  <span class="material-icons">open_in_new</span>
                </a>
              </div>
              <div class="info-row" v-if="tokenData.operator">
                <span class="info-label">Operator</span>
                <router-link :to="`/addresses/${tokenData.operator}`" class="info-value address-link">
                  {{ operatorDisplay }}
                </router-link>
              </div>
              <div class="info-row">
                <span class="info-label">Contract</span>
                <router-link :to="`/contracts/${contract.name}`" class="info-value contract-link">
                  {{ contract.name }}
                </router-link>
              </div>
              <div class="info-row" v-if="tokenData.total_supply">
                <span class="info-label">Total Supply</span>
                <span class="info-value">{{ formatNumber(tokenData.total_supply) }}</span>
              </div>
              <div class="info-row" v-if="tokenData.holder_count !== undefined">
                <span class="info-label">Total Holders</span>
                <span class="info-value">{{ tokenData.holder_count }}</span>
              </div>
            </div>
          </div>
        </div>

      
        <!-- Token Holders Section -->
        <div class="holders-section">
          <div class="info-card">
            <h3 class="card-title">
              <span class="material-icons">people</span>
              Token Holders
            </h3>
            <div class="card-content">
              <div v-if="holders && holders.length > 0" class="table-container">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Address / XNS</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="holder in holders" :key="holder.address">
                      <td>
                         <router-link :to="`/addresses/${holder.address}`" class="address-link">
                            {{ holder.display || holder.address }}
                          </router-link>
                      </td>
                      <td class="balance-cell">
                        <span class="balance-amount">{{ formatBalance(holder.balance) }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <!-- Pagination -->
                <div class="pagination">
                  <button 
                    @click="prevPage" 
                    :disabled="currentPage <= 1"
                    class="pagination-button"
                  >
                    <span class="material-icons">chevron_left</span>
                    Previous
                  </button>
                  <span class="page-info">Page {{ currentPage }}</span>
                  <button 
                    @click="nextPage" 
                    :disabled="!hasMoreHolders"
                    class="pagination-button"
                  >
                    Next
                    <span class="material-icons">chevron_right</span>
                  </button>
                </div>
              </div>
              <div v-else class="no-holders">
                <div class="no-holders-icon">👥</div>
                <p>No holders found for this token</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex"
import axios from "axios"

export default {
  name: "ModernPageToken",
  data() {
    return {
      loading: true,
      error: null,
      contract: {},
      tokenData: {},
      markets: [],
      holders: [],
      tokenSymbols: new Map(),
      currentPage: 1,
      pageSize: 20,
      hasMoreHolders: false,          // NEW
    xnsCache: new Map(),            // NEW - cache XNS lookups
    }
  },
  computed: {
    ...mapGetters(["blockchain"]),
    jsonUrl() {
      const contractName = this.$route.params.contract
      const query = `
        query ContractAndToken {
          contractByName(name: "${contractName}") {
            code
            xsc0001
          }
          allStates(filter: { key: { in: ["${contractName}.metadata:token_name", "${contractName}.metadata:token_symbol", "${contractName}.metadata:token_website", "${contractName}.metadata:operator", "${contractName}.metadata:total_supply"] } }) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      `
      return `${this.blockchain.rpc}/graphql?query=${encodeURIComponent(query)}`
    },
    operatorDisplay() {
      if (!this.tokenData.operator) return ''
      return this.tokenData.operator.length > 16 
        ? `${this.tokenData.operator.substring(0, 8)}...${this.tokenData.operator.substring(this.tokenData.operator.length - 8)}`
        : this.tokenData.operator
    }
  },
  async mounted() {
    await this.fetchToken(this.$route.params.contract)
  },
  watch: {
    '$route.params.contract': {
      handler(newContract) {
        if (newContract) {
          this.fetchToken(newContract)
        }
      },
      immediate: true
    }
  },
  methods: {
    async resolveXnsName(address) {
    if (this.xnsCache.has(address)) return this.xnsCache.get(address)
    try {
      const payload = {
        sender: "",
        contract: "con_name_service_final",
        function: "get_address_to_main_name",
        kwargs: { address }
      }
      const bytes = new TextEncoder().encode(JSON.stringify(payload))
      const hex = Array.from(bytes).map(x => ("00" + x.toString(16)).slice(-2)).join("")
      const resp = await fetch(`${this.blockchain.rpc}/abci_query?path="/simulate_tx/${hex}"`)
      const json = await resp.json()
      const v = json && json.result && json.result.response && json.result.response.value
      if (!v) { this.xnsCache.set(address, ""); return "" }
      const decoded = JSON.parse(atob(v))
      const name = (decoded.status !== 1 && decoded.result && decoded.result !== "None")
        ? decoded.result.replace(/'/g, "")
        : ""
      this.xnsCache.set(address, name)
      return name
    } catch (e) {
      console.error("Error resolving XNS name:", e)
      this.xnsCache.set(address, "")
      return ""
    }
  },
    async fetchToken(contractName) {
      this.loading = true
      this.error = null
      
      try {
        // Fetch contract and token data
        const query = `
          query ContractAndToken {
            contractByName(name: "${contractName}") {
              code
              xsc0001
            }
            allStates(filter: { key: { in: ["${contractName}.metadata:token_name", "${contractName}.metadata:token_symbol", "${contractName}.metadata:token_website", "${contractName}.metadata:operator", "${contractName}.metadata:total_supply"] } }) {
              edges {
                node {
                  key
                  value
                }
              }
            }
          }
        `
        
        const response = await axios.post(`${this.blockchain.rpc}/graphql`, { query })
        const data = response.data.data
        
        if (!data.contractByName) {
          this.error = "Contract not found"
          return
        }
        
        this.contract = {
          name: contractName,
          code: data.contractByName.code,
          isToken: data.contractByName.xsc0001 === true
        }
        
        if (!this.contract.isToken) {
          this.error = "This contract is not a token"
          return
        }
        
        // Process token metadata
        this.tokenData = {}
        data.allStates.edges.forEach(edge => {
          const key = edge.node.key.split(':')[1]
          this.tokenData[key] = edge.node.value
        })
        
        // Fetch additional data
        await Promise.all([
          this.fetchMarkets(contractName),
          this.fetchHolders(contractName),
          this.fetchHolderCount(contractName)
        ])
        
      } catch (error) {
        console.error('Error fetching token:', error)
        this.error = error.message || 'Failed to load token data'
      } finally {
        this.loading = false
      }
    },
    
    async fetchMarkets(contractName) {
      try {
        // This would fetch market data from DEX APIs
        // For now, we'll use empty array as placeholder
        this.markets = []
      } catch (error) {
        console.error('Error fetching markets:', error)
        this.markets = []
      }
    },
    
    async fetchHolders(contractName) {
  try {
    const first = this.pageSize + 1       // fetch one extra to know if next page exists
    const offset = (this.currentPage - 1) * this.pageSize
    const query = `
      query TokenHolders($keyPrefix:String!, $first:Int!, $offset:Int!){
        allStates(
          filter:{
            and:{
              key:{ startsWith:$keyPrefix, notLike:"%:%:%" }
              valueNumeric:{ greaterThan:"0" }
            }
          }
          orderBy: VALUE_NUMERIC_DESC
          first:$first
          offset:$offset
        ){
          edges{ node{ key value } }
        }
      }`
    const variables = { keyPrefix: `${contractName}.balances:`, first, offset }

    const response = await axios.post(`${this.blockchain.rpc}/graphql`, { query, variables })
    const data = response && response.data && response.data.data ? response.data.data : {}
const edges = data.allStates && data.allStates.edges ? data.allStates.edges : []

    // determine if there's another page
    this.hasMoreHolders = edges.length > this.pageSize

    // take only this page
    const pageEdges = edges.slice(0, this.pageSize)

    // map to holders (with XNS display)
    this.holders = await Promise.all(pageEdges.map(async ({ node }) => {
      const parts = String(node.key).split(':')
      const address = parts[1] || ""      // address is the first segment after the colon
      const display = await this.resolveXnsName(address)
      return {
        address,
        display: display || address,
        balance: parseFloat(node.value) || 0
      }
    }))
  } catch (error) {
    console.error('Error fetching holders:', error)
    this.holders = []
    this.hasMoreHolders = false
  }
},

    
    async fetchHolderCount(contractName) {
  try {
    const query = `
      query HolderCount($prefix:String!){
        allStates(
          filter:{
            and:{
              key:{ startsWith:$prefix, notLike:"%:%:%" }
              valueNumeric:{ greaterThan:"0" }
            }
          }
        ){
          totalCount
        }
      }`
    const variables = { prefix: `${contractName}.balances:` }
    const response = await axios.post(`${this.blockchain.rpc}/graphql`, { query, variables })
    const d = response && response.data && response.data.data ? response.data.data : {}
const total = d.allStates && typeof d.allStates.totalCount !== 'undefined'
  ? d.allStates.totalCount
  : 0
this.tokenData.holder_count = total
  } catch (error) {
    console.error('Error fetching holder count:', error)
    this.tokenData.holder_count = 0
  }
},

    
    formatNumber(num) {
      if (!num) return '0'
      const number = parseFloat(num)
      if (number >= 1e9) {
        return (number / 1e9).toFixed(2) + 'B'
      } else if (number >= 1e6) {
        return (number / 1e6).toFixed(2) + 'M'
      } else if (number >= 1e3) {
        return (number / 1e3).toFixed(2) + 'K'
      }
      return number.toLocaleString()
    },
    
    formatBalance(balance) {
      if (!balance) return '0.00000000'
      return parseFloat(balance).toFixed(8)
    },
    
    nextPage() {
  if (this.hasMoreHolders) {
    this.currentPage++
    this.fetchHolders(this.$route.params.contract)
  }
},
prevPage() {
  if (this.currentPage > 1) {
    this.currentPage--
    this.fetchHolders(this.$route.params.contract)
  }
}
  }
}
</script>

<style scoped>
.modern-page-token {
      min-height: calc(100vh - 72px);
    background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
    color: #fff;
}

/* Loading States */
.loading-container, .error-container, .not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon, .not-found-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.retry-button {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 212, 255, 0.3);
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
}

.header-content-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff 0%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.token-badge {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.page-description {
  color: #8892b0;
  font-size: 1.125rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.json-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.json-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.1);
}

/* Content Container */
.token-content-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Info Cards */
.info-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-title .material-icons {
  font-size: 1.5rem;
  color: #00d4ff;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #8892b0;
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  color: #ffffff;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
}

.token-symbol {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.address-link, .contract-link, .website-link {
  color: #00d4ff;
  text-decoration: none;
  transition: color 0.3s ease;
}

.address-link:hover, .contract-link:hover, .website-link:hover {
  color: #ffffff;
}

.website-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Tables */
.markets-table-container, .holders-table-container {
  overflow-x: auto;
}

.markets-table, .holders-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.markets-table th, .holders-table th {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.markets-table td, .holders-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.pair-link, .chart-link {
  color: #00d4ff;
  text-decoration: none;
  margin-right: 0.5rem;
}

.pair-link:hover, .chart-link:hover {
  color: #ffffff;
}

.change-positive {
  color: #4ade80;
}

.change-negative {
  color: #f87171;
}

.change-neutral {
  color: #8892b0;
}

.balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
}

/* No Data States */
.no-markets, .no-holders {
  text-align: center;
  padding: 3rem 1rem;
  color: #8892b0;
}

.no-markets-icon, .no-holders-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0.5rem;

  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.pagination-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.pagination-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 212, 255, 0.3);
}

.pagination-button:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #8892b0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.page-info {
  color: #8892b0;
  font-weight: 500;
}

/* Text Overflow Fixes */
.info-value, .address-link, .contract-link, .website-link {
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modern-page-token {
    padding: 0;
  }

  .header-content-inner {
    padding: 1.5rem;
  }

  .token-content-inner {
    padding: 0 1rem;
  }

  .page-title {
    font-size: 2rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .info-card {
    padding: 1.5rem;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-value {
    text-align: left;
  }

  .markets-table, .holders-table {
    font-size: 0.875rem;
  }

  .markets-table th, .holders-table th,
  .markets-table td, .holders-table td {
    padding: 0.75rem 0.5rem;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }

  
}
.holders-section{
    padding-bottom: 0.5rem;
  }
</style>
<style lang="stylus" scoped>
.table-container
  background rgba(255, 255, 255, 0.05)
  border-radius 12px
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
// Responsive Design
@media (max-width: 768px)
  .modern-table
    thead th
      padding 1rem
      font-size 0.75rem
    
    tbody td
      padding 1rem
</style>