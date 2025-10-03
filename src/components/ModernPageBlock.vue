<template>
  <div class="modern-page-block">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading block details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Block</h3>
      <p>{{ error }}</p>
      <button @click="fetchBlock" class="retry-button">Try Again</button>
    </div>

    <!-- Block Content -->
    <div v-else class="block-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content-inner">
        <div class="header-content">
          <div class="header-main">
            <h1 class="page-title">
              Block #{{ block.header.height }}
            </h1>
            <p class="page-description">
              Block details and transaction information
            </p>
          </div>
          <div class="header-actions">
            <a :href="jsonUrl" target="_blank" class="json-button">
              <span class="material-icons">code</span>
              JSON
            </a>
          </div>
        </div>

        <!-- Navigation -->
        <div class="block-navigation">
          <router-link 
            v-if="hasPrevBlock"
            :to="{ name: 'block', params: { block: prevHeight }}" 
            class="nav-button prev"
          >
            <span class="material-icons">chevron_left</span>
            Block {{ prevHeight }}
          </router-link>
          <div v-else class="nav-button disabled">
            <span class="material-icons">chevron_left</span>
            Previous Block
          </div>

          <router-link 
            v-if="hasNextBlock"
            :to="{ name: 'block', params: { block: nextHeight }}" 
            class="nav-button next"
          >
            Block {{ nextHeight }}
            <span class="material-icons">chevron_right</span>
          </router-link>
          <div v-else class="nav-button disabled">
            Next Block
            <span class="material-icons">chevron_right</span>
          </div>
        </div>
        </div>
      </div>

      <!-- Block Information Cards -->
      <div class="block-content-inner">
      <div class="info-cards">
        <!-- Basic Info Card -->
        <div class="info-card">
          <h3 class="card-title">Block Information</h3>
          <div class="card-content">
            <div class="info-row">
              <span class="info-label">Height</span>
              <span class="info-value">{{ block.header.height }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Timestamp</span>
              <span class="info-value">{{ formatDate(block.header.time) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Transactions</span>
              <span class="info-value">{{ block.header.num_txs }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Chain ID</span>
              <span class="info-value">{{ block.header.chain_id }}</span>
            </div>
          </div>
        </div>

       <!-- Hash Information Card -->
<div class="info-card">
  <h3 class="card-title">Hash Information</h3>
  <div class="card-content">
    <div class="info-row full">
      <span class="info-label">App Hash</span>
      <span class="info-value hash-value">{{ block.header.app_hash || '—' }}</span>
    </div>
    <div class="info-row full">
      <span class="info-label">Last Commit Hash</span>
      <span class="info-value hash-value">{{ block.header.last_commit_hash || '—' }}</span>
    </div>
    <div class="info-row full">
      <span class="info-label">Validators Hash</span>
      <span class="info-value hash-value">{{ block.header.validators_hash || '—' }}</span>
    </div>
  </div>
</div>

<!-- Previous Block Card -->
<div class="info-card" v-if="block.header.last_block_id">
  <h3 class="card-title">Previous Block</h3>
  <div class="card-content">
    <div class="info-row full">
      <span class="info-label">Hash</span>
      <span class="info-value hash-value">{{ block.header.last_block_id.hash || '—' }}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Parts Total</span>
      <span class="info-value">{{ block.header.last_block_id.parts.total || '—' }}</span>
    </div>
    <div class="info-row full">
      <span class="info-label">Parts Hash</span>
      <span class="info-value hash-value">{{ block.header.last_block_id.parts.hash || '—' }}</span>
    </div>
  </div>
</div>
      </div>

      <!-- Transactions Section -->
      <div v-if="block.data && block.data.txs && block.data.txs.length > 0" class="transactions-section">
        <h2 class="section-title">Transactions ({{ block.data.txs.length }})</h2>
        <div class="transactions-table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Transaction Hash</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(tx, index) in block.data.txs" :key="index">
                <td>
                  <router-link 
                    :to="{ name: 'tx', params: { hash: txHash(index) }}" 
                    class="tx-hash-link"
                  >
                    {{ formatHash(txHash(index)) }}
                  </router-link>
                </td>
                <td>
                  <span class="tx-type">Transaction</span>
                </td>
                <td>
                  <span class="status-badge success">Success</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- No Transactions -->
      <div v-else class="no-transactions">
        <div class="empty-icon">📄</div>
        <h3>No Transactions</h3>
        <p>This block contains no transactions.</p>
      </div>

      <!-- Validators Section (if available) -->
      <div v-if="block.last_commit && block.last_commit.precommits && block.last_commit.precommits.length > 0" class="validators-section">
        <h2 class="section-title">Validator Precommits</h2>
        <div class="validators-grid">
          <div 
            v-for="(precommit, index) in validPrecommits" 
            :key="index" 
            class="validator-card"
          >
            <h4 class="validator-title">Validator {{ index + 1 }}</h4>
            <div class="validator-info">
              <div class="info-row">
                <span class="info-label">Address</span>
                <span class="info-value hash-value">{{ precommit.validator_address }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Index</span>
                <span class="info-value">{{ precommit.validator_index }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Round</span>
                <span class="info-value">{{ precommit.round }}</span>
              </div>
              <div class="info-row" v-if="precommit.signature">
                <span class="info-label">Signature Type</span>
                <span class="info-value">{{ precommit.signature.type || 'N/A' }}</span>
              </div>
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
import createHash from "create-hash"

export default {
  name: "ModernPageBlock",
  computed: {
    ...mapGetters([
      "blockchain",
      "totalBlocks"
    ]),
    prevHeight() {
      return this.block.header.height - 1
    },
    nextHeight() {
      return this.block.header.height + 1
    },
    hasPrevBlock() {
      return this.prevHeight > 0
    },
    hasNextBlock() {
      return this.nextHeight <= this.totalBlocks
    },
    validPrecommits() {
      if (!this.block.last_commit || !this.block.last_commit.precommits) return []
      return this.block.last_commit.precommits.filter(p => p !== null)
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      jsonUrl: "",
      block: {
        header: {
          chain_id: "",
          height: 0,
          time: "",
          num_txs: 0,
          last_block_id: {
            hash: "",
            parts: {
              total: 0,
              hash: ""
            }
          },
          last_commit_hash: "",
          data_hash: "",
          validators_hash: "",
          app_hash: ""
        },
        data: {
          txs: []
        },
        last_commit: {
          blockID: {
            hash: "",
            parts: {
              total: 0,
              hash: ""
            }
          },
          precommits: []
        }
      }
    }
  },
  methods: {
    txHash(idx) {
      let tx = this.block.data.txs[idx]
      let b64str = tx.replace(/^:base64:/, '')
      let buffer = Buffer.from(b64str, 'base64')
      let hex = createHash('sha256').update(buffer).digest('hex')
      return hex.substr(0, 64).toUpperCase()
    },
    async fetchBlock() {
      try {
        this.loading = true
        this.error = null
        
        this.jsonUrl = `${this.blockchain.rpc}/block?height=${this.$route.params.block}`
        let json = await axios.get(this.jsonUrl)
        this.block = json.data.result.block
        this.block.header.height = parseInt(this.block.header.height)
        this.block.header.num_txs = this.block.data.txs.length
        
        this.loading = false
      } catch (error) {
        console.error('Error fetching block:', error)
        this.error = 'Failed to load block data. Please try again.'
        this.loading = false
      }
    },
    formatDate(dateString) {
      if (!dateString) return '—'
      return new Date(dateString).toLocaleString()
    },
    formatHash(hash) {
      if (!hash) return '—'
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
    }
  },
  async mounted() {
    await this.fetchBlock()
  },
  watch: {
   /* '$route'(to, from) {
      this.fetchBlock()
    }*/
    '$route'() {
      this.fetchBlock()
    }
  }
}
</script>

<style scoped>
.modern-page-block {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
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

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
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
  margin-bottom: 2rem;
}

.block-content-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff 0%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.latest-badge {
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  color: #0f1419;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.page-description {
  color: #8892b0;
  font-size: 1.1rem;
  margin: 0;
  text-align: left;
}

.json-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.json-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Block Navigation */
.block-navigation {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-button:not(.disabled) {
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
}

.nav-button:not(.disabled):hover {
  background: rgba(0, 212, 255, 0.2);
  transform: translateY(-2px);
}

.nav-button.disabled {
  background: rgba(255, 255, 255, 0.05);
  color: #64748b;
  cursor: not-allowed;
}

/* Info Cards */
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.info-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.info-label {
  color: #8892b0;
  font-weight: 500;
  min-width: 120px;
  flex-shrink: 0;
}

.info-value {
  color: #ffffff;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.hash-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #00d4ff;
}

/* Sections */
.section-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(0, 212, 255, 0.3);
}

/* Transactions */
.transactions-section {
  margin-bottom: 3rem;
}

.transactions-table-container {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table th {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.transactions-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.transactions-table tr:last-child td {
  border-bottom: none;
}

.tx-hash-link {
  color: #00d4ff;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  transition: color 0.3s ease;
}

.tx-hash-link:hover {
  color: #ffffff;
}

.tx-type {
  color: #8892b0;
  font-weight: 500;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.success {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

/* No Transactions */
.no-transactions {
  text-align: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin-bottom: 3rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Validators */
.validators-section {
  margin-bottom: 3rem;
}

.validators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.validator-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.validator-title {
  font-size: 1rem;
  font-weight: 600;
  color: #00d4ff;
  margin: 0 0 0.75rem 0;
}

.validator-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modern-page-block {
  }

  .page-title {
    font-size: 2rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .block-navigation {
    flex-direction: column;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-value {
    text-align: left;
  }

  .transactions-table {
    font-size: 0.875rem;
  }

  .transactions-table th,
  .transactions-table td {
    padding: 0.75rem 0.5rem;
  }
}
/* --- Unified top-label grid (matches Tx page) --- */
.card-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem 1.25rem;
}

/* each pair is a tile with label above value */
.info-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
}

.info-label {
  color: #9aa4bf;
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  min-width: 0;
}

.info-value {
  color: #ffffff;
  font-weight: 600;
  text-align: left;      /* override old right alignment */
  word-break: break-word;
}

/* long items span full width of the card grid */
.info-row.full {
  grid-column: 1 / -1;
}

/* monospace accent for hashes (kept) */
.hash-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #00d4ff;
}

/* Make validator info align with the same pattern */
.validator-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem 1.25rem;
}

/* responsive: single column inside cards */
@media (max-width: 768px) {
  .card-content {
    grid-template-columns: 1fr;
  }
}

</style>