<template>
  <div class="modern-page-contract">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading contract details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Contract</h3>
      <p>{{ error }}</p>
      <button @click="fetchContract($route.params.contract)" class="retry-button">Try Again</button>
    </div>

    <!-- Contract Not Found -->
    <div v-else-if="!contract.code" class="not-found-container">
      <div class="not-found-icon">📄</div>
      <h3>Contract Not Found</h3>
      <p>The contract "{{ $route.params.contract }}" could not be found.</p>
    </div>

    <!-- Contract Content -->
    <div v-else class="contract-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-main">
            <h1 class="page-title">
              {{ contract.name }}
              <span v-if="contract.isToken" class="token-badge">Token</span>
            </h1>
            <p class="page-description">
              Smart contract details and source code
            </p>
          </div>
          <div class="header-actions">
            <a :href="jsonUrl" target="_blank" class="json-button">
              <span class="material-icons">code</span>
              JSON
            </a>
          </div>
        </div>
      </div>

      <!-- Token Information (if applicable) -->
      <div v-if="contract.isToken && Object.keys(tokenData).length" class="token-section">
        <div class="info-card">
          <h3 class="card-title">Token Information</h3>
          <div class="card-content">
            <div class="info-row" v-if="tokenData.token_name">
              <span class="info-label">Token Name</span>
              <span class="info-value">{{ tokenData.token_name }}</span>
            </div>
            <div class="info-row" v-if="tokenData.token_symbol">
              <span class="info-label">Symbol</span>
              <span class="info-value token-symbol">{{ tokenData.token_symbol }}</span>
            </div>
            <div class="info-row" v-if="tokenData.total_supply">
              <span class="info-label">Total Supply</span>
              <span class="info-value">{{ formatNumber(tokenData.total_supply) }}</span>
            </div>
            <div class="info-row" v-if="tokenData.operator">
              <span class="info-label">Operator</span>
              <router-link :to="`/addresses/${tokenData.operator}`" class="info-value address-link">
                {{ operatorDisplay }}
              </router-link>
            </div>
            <div class="info-row" v-if="tokenData.token_website">
              <span class="info-label">Website</span>
              <a :href="tokenData.token_website" target="_blank" class="info-value website-link">
                {{ tokenData.token_website }}
              </a>
            </div>
            <div class="info-row">
              <span class="info-label">Token Page</span>
              <router-link :to="`/tokens/${contract.name}`" class="info-value token-link">
                View Token Details
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Contract Details -->
      <div class="contract-details">
        <div class="info-card">
          <h3 class="card-title">Contract Details</h3>
          <div class="card-content">
            <div class="info-row">
              <span class="info-label">Name</span>
              <span class="info-value contract-name">{{ contract.name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Type</span>
              <span class="info-value">
                <span v-if="contract.isToken" class="contract-type token">Smart Contract (Token)</span>
                <span v-else class="contract-type standard">Smart Contract</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Language</span>
              <span class="info-value">Python</span>
            </div>
            <div class="info-row">
              <span class="info-label">Code Size</span>
              <span class="info-value">{{ formatBytes(contract.code.length) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Source Code Section -->
      <div class="source-code-section">
        <div class="code-header">
          <h2 class="section-title">Source Code</h2>
          <div class="code-actions">
            <button @click="copyCode" class="copy-code-button">
              <span class="material-icons">content_copy</span>
              Copy Code
            </button>
            <button @click="toggleFullscreen" class="fullscreen-button">
              <span class="material-icons">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
              {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
            </button>
          </div>
        </div>
        
        <div class="code-container" :class="{ fullscreen: isFullscreen }">
          <div class="code-header-bar">
            <div class="code-info">
              <span class="language-badge">Python</span>
              <span class="line-count">{{ getLineCount() }} lines</span>
            </div>
            <button v-if="isFullscreen" @click="toggleFullscreen" class="close-fullscreen">
              <span class="material-icons">close</span>
            </button>
          </div>
          <pre class="code-block"><code class="hljs python" v-html="highlightedCode"></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex"
import axios from "axios"
// ── highlight.js setup ─────────────────────────────────────
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
hljs.registerLanguage('python', python)

export default {
  name: "ModernPageContract",
  computed: {
    ...mapGetters(["blockchain"]),
    operatorDisplay() {
      if (this.operatorXnsName) return this.operatorXnsName
      return this.formatHash(this.tokenData.operator) || ""
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      jsonUrl: "",
      contract: {
        name: "",
        code: "",
        isToken: false
      },
      tokenData: {},
      operatorXnsName: "",
      highlightedCode: "",
      isFullscreen: false
    }
  },
  methods: {
    async fetchContract(name) {
      try {
        this.loading = true;
        this.error = null;

        const tokenKeys = [
          `${name}.metadata:token_name`,
          `${name}.metadata:token_symbol`,
          `${name}.metadata:token_website`,
          `${name}.metadata:operator`,
          `${name}.metadata:total_supply`
        ]

        const gqlQuery = {
          query: `
            query ContractAndToken {
              contractByName(name: "${name}") {
                code
                xsc0001
              }
              allStates(filter: { key: { in: [${tokenKeys.map(k => `"${k}"`).join(", ")}] } }) {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
            }
          `
        }

        const res = await axios.post(`${this.blockchain.rpc}/graphql`, gqlQuery, {
          headers: { 'Content-Type': 'application/json' }
        })

        const contractData = res.data.data.contractByName || {}
        const stateData = res.data.data.allStates.edges || []

        this.contract.name = name
        this.contract.code = contractData.code || ""
        this.contract.isToken = contractData.xsc0001 === true

        // Produce highlighted HTML once code is fetched
        this.highlightedCode = this.contract.code
          ? hljs.highlight('python', this.contract.code).value
          : ''

        this.tokenData = {}
        stateData.forEach(({ node }) => {
          const key = node.key.split(":")[1]
          this.tokenData[key] = node.value
        })

        // Resolve operator XNS
        if (this.tokenData.operator) {
          this.operatorXnsName = await this.resolveXnsName(this.tokenData.operator)
        }

        this.jsonUrl = `${this.blockchain.rpc}/graphql?query=${encodeURIComponent(gqlQuery.query)}`
        this.loading = false;
      } catch (err) {
        console.error("Error fetching contract/token data:", err)
        this.error = 'Failed to load contract data. Please try again.'
        this.loading = false;
      }
    },
    async resolveXnsName(address) {
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
        if (!json.result || !json.result.response || !json.result.response.value) {
          return ""
        }

        let decoded = JSON.parse(atob(json.result.response.value))
        if (decoded.status !== 1 && decoded.result && decoded.result !== "None") {
          return decoded.result.replace(/'/g, "")
        }
      } catch (error) {
        console.error("Error resolving XNS name:", error)
      }
      return ""
    },
    formatHash(hash) {
      if (!hash) return '—'
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
    },
    formatNumber(num) {
      if (!num) return '—'
      return parseFloat(num).toLocaleString()
    },
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    getLineCount() {
      if (!this.contract.code) return 0
      return this.contract.code.split('\n').length
    },
    copyCode() {
      if (!this.contract.code) return;

      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.contract.code)
          .then(() => {
            // You could add a toast notification here
            console.log("Code copied to clipboard");
          })
          .catch(err => {
            console.error("Clipboard copy failed", err);
            this.fallbackCopyTextToClipboard(this.contract.code);
          });
      } else {
        this.fallbackCopyTextToClipboard(this.contract.code);
      }
    },
    fallbackCopyTextToClipboard(text) {
      let tempInput = document.createElement("textarea");
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      console.log("Code copied to clipboard (fallback method)");
    },
    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
      if (this.isFullscreen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  },
  async mounted() {
    await this.fetchContract(this.$route.params.contract)
  },
  beforeDestroy() {
    // Clean up fullscreen state
    document.body.style.overflow = '';
  },
  watch: {
    '$route'() {
      this.fetchContract(this.$route.params.contract);
    }
  }
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css');

.modern-page-contract {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
  color: #ffffff;
  padding: 2rem;
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
.error-container, .not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.error-icon, .not-found-icon {
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
  margin-bottom: 2rem;
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
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.token-badge {
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

/* Sections */
.token-section, .contract-details {
  margin-bottom: 2rem;
}

/* Info Cards */
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

.contract-name {
  color: #00d4ff;
  font-family: 'JetBrains Mono', monospace;
}

.token-symbol {
  color: #00ff88;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.address-link, .token-link {
  color: #00d4ff;
  text-decoration: none;
  transition: color 0.3s ease;
}

.address-link:hover, .token-link:hover {
  color: #ffffff;
}

.website-link {
  color: #00ff88;
  text-decoration: none;
  transition: color 0.3s ease;
}

.website-link:hover {
  color: #ffffff;
}

.contract-type {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.contract-type.token {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.contract-type.standard {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

/* Source Code Section */
.source-code-section {
  margin-bottom: 2rem;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.code-actions {
  display: flex;
  gap: 0.5rem;
}

.copy-code-button, .fullscreen-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.copy-code-button:hover, .fullscreen-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

/* Code Container */
.code-container {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.code-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.95);
}

.code-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.code-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.language-badge {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.line-count {
  color: #8892b0;
  font-size: 0.875rem;
}

.close-fullscreen {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #ffffff;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-fullscreen:hover {
  background: rgba(255, 255, 255, 0.2);
}

.code-block {
  margin: 0;
  padding: 1.5rem;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.code-container.fullscreen .code-block {
  height: calc(100vh - 80px);
  overflow-y: auto;
}

/* Override highlight.js background */
.hljs {
  background: none !important;
  color: #abb2bf;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modern-page-contract {
    padding: 1rem;
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

  .code-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .code-actions {
    width: 100%;
    justify-content: stretch;
  }

  .copy-code-button, .fullscreen-button {
    flex: 1;
    justify-content: center;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-value {
    text-align: left;
  }

  .code-header-bar {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .code-block {
    font-size: 0.75rem;
    padding: 1rem;
  }
}
</style>