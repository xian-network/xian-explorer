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
            </h1>
            <p class="page-description">
              Smart contract details and source code
            </p>
          </div>

        </div>
      </div>

      <!-- Contract Content -->
      <div class="contract-content-inner">
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
            <!-- NEW: line-by-line rendering with inline Run chip -->
            <div class="code-lines">
              <div v-for="(line, idx) in codeLines" :key="idx">
                <div class="code-line">
                  <code class="hljs python" v-html="highlightLine(line)"></code>

                  <!-- Run chip on exported function lines -->
                 <button
                    v-if="exportedByLine[idx]"
                    class="run-chip"
                    title="Run (read-only)"
                    @click="openRunner(idx)"
                  >
                    <span class="run-chip__icon" aria-hidden="true"></span>
                    <span class="run-chip__label">Run</span>
                  </button>
                </div>

                <transition name="fade">
                  <div v-if="runner.visible && runner.insertAfterIdx === idx" class="inline-runner">
                    <div class="inline-runner-header">
                      <strong>{{ runner.meta.name }} (Read-Only Call)</strong>
                      <button class="mini-close" @click="runner.visible = false">✕</button>
                    </div>

                    <div class="inline-runner-body">
                      <label>Sender (optional)</label>
                      <input v-model.trim="runner.sender" class="runner-input" placeholder="Address" />

                      <label>Kwargs (JSON)</label>
                      <textarea v-model="runner.kwargsText" class="runner-textarea" rows="6"></textarea>

                      <div class="runner-actions">
                        <button class="runner-btn" :disabled="runner.calling" @click="simulateFunction">
                          {{ runner.calling ? 'Running…' : 'Run' }}
                        </button>
                      </div>

                      <div v-if="runner.response" class="runner-out">
  <div class="out-header">
    <span class="badge" :class="isSuccess(runner.response) ? 'ok' : 'bad'">
      {{ isSuccess(runner.response) ? 'Success' : 'Failed' }}
    </span>
    <span class="muted">Stamps: {{ runner.response.stamps_used }}</span>
  </div>

  <div class="out-section" v-if="normalizeResult(runner.response) !== null">
    <div class="out-title">Return</div>
    <pre class="runner-pre">{{ pretty(normalizeResult(runner.response)) }}</pre>
  </div>

  <div class="out-section" v-if="runner.response.state && runner.response.state.length">
    <div class="out-title">State (Simulated)</div>
    <table class="state-table">
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>
        <tr v-for="(s, i) in runner.response.state" :key="i">
          <td><code>{{ s.key }}</code></td>
          <td><code>{{ s.value }}</code></td>
        </tr>
      </tbody>
    </table>
    <br />
    <div class="muted">This is a read-only call — state is not persisted.</div>
  </div>

 
</div>

                    </div>
                  </div>
                </transition>
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
    },
    codeLines() {
      return (this.contract.code || "").split("\n")
    },
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
      isFullscreen: false,
      // NEW: map line index -> { name, params }
      exportedByLine: {},

      // NEW: inline runner state
      runner: {
        visible: false,
        insertAfterIdx: null,
        meta: null,            // { name, params }
        sender: "",
        kwargsText: "{}",
        calling: false,
        response: null,
        error: null,
        lastUrl: "",
        lastPayload: null            // NEW
      }
    }
  },
  methods: {
    // NEW: highlight a single line (keeps hljs)
    highlightLine(line) {
      if (line === "") return "&nbsp;"
      try { return hljs.highlight('python', line).value } catch (e) {
        return line
      }
    },

    // NEW: parse @export… def …() lines -> mark the line containing 'def'
    parseExportedFunctions() {
      const src = this.contract.code || ""
      const lines = src.split("\n")
      const map = {}
      let pendingExport = false

      const matchDef = (s) => s.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:/)
      const cleanParams = (sig) => {
        if (!sig) return []
        return sig
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          // ignore kw-only marker and vararg markers
          .filter(s => s !== "*" && s !== "/")
          .map(s => {
            // remove default part
            const noDefault = s.replace(/=.*/, "").trim()
            // grab bare identifier after any * or ** and before any annotation
            const m = noDefault.match(/^\*{0,2}\s*([A-Za-z_]\w*)/)
            return m ? m[1] : null
          })
          .filter(Boolean)
          .filter(name => name !== "self" && name !== "ctx")
      }
      for (let i = 0; i < lines.length; i++) {
        const L = lines[i]

        // Inline decorator + def on same line
        const inline = L.match(/@export(?:\s*\(\s*\))?.*def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:/)
        if (inline) {
          map[i] = { name: inline[1], params: cleanParams(inline[2]) }
          pendingExport = false
          continue
        }

        // Decorator only
        if (/^\s*@export(?:\s*\(\s*\))?\s*$/.test(L)) {
          pendingExport = true
          continue
        }

        // Next def after decorator
        if (pendingExport) {
          const m = matchDef(L)
          if (m) {
            map[i] = { name: m[1], params: cleanParams(m[2]) }
            pendingExport = false
            continue
          }
          // Keep waiting until we see a def or a blank line resets
          if (/^\s*$/.test(L)) pendingExport = false
        }
      }

      this.exportedByLine = map
    },

    // NEW: open inline runner under the clicked line
    openRunner(lineIdx) {
      const meta = this.exportedByLine[lineIdx]
      if (!meta) return
      this.runner.visible = true
      this.runner.insertAfterIdx = lineIdx
      this.runner.meta = meta
      // prefill kwargs scaffold from params
      const o = {}; meta.params.forEach(p => o[p] = "")
      this.runner.kwargsText = JSON.stringify(o, null, 2)
      this.runner.sender = ""
      this.runner.response = null
      this.runner.error = null
      this.runner.lastUrl = ""
    },

    // NEW: simulate read-only call for the selected function
   async simulateFunction() {
    try {
      this.runner.calling = true
      this.runner.error = null
      this.runner.response = null
      this.runner.lastUrl = ""

      var kwargs
      try { kwargs = this.runner.kwargsText ? JSON.parse(this.runner.kwargsText) : {} }
      catch (e) { throw new Error("Kwargs is not valid JSON.") }

      var payload = {
        sender: this.runner.sender || "",
        contract: this.contract.name,
        function: this.runner.meta.name,
        kwargs: kwargs
      }
      this.runner.lastPayload = payload   // NEW

      var bytes = new TextEncoder().encode(JSON.stringify(payload))
      var hex = Array.from(bytes).map(function (x) { return ("00" + x.toString(16)).slice(-2) }).join("")
      var url = this.blockchain.rpc + '/abci_query?path="/simulate_tx/' + hex + '"'
      this.runner.lastUrl = url

      var resp = await fetch(url)
      var json = await resp.json()
      var respObj = (json && json.result) ? json.result.response : null
      var base64 = respObj && typeof respObj.value !== 'undefined' ? respObj.value : null

      if (!base64) {
        this.runner.response = respObj || json
        return
      }

      var decodedStr = atob(base64)
      try {
        this.runner.response = JSON.parse(decodedStr)
      } catch (e) {
        // if node returns plain text, wrap minimally
        this.runner.response = { status: 0, result: decodedStr }
      }
    } catch (e) {
      this.runner.error = (e && e.message) ? e.message : String(e)
    } finally {
      this.runner.calling = false
    }
  },

    // NEW: utilities
    prefillKwargs() {
      if (!this.runner || !this.runner.meta) return
      const o = {}; this.runner.meta.params.forEach(p => o[p] = "")
      this.runner.kwargsText = JSON.stringify(o, null, 2)
    },
    // Replace your pretty() with this:
  pretty(v) {
    if (v === null || typeof v === 'undefined') return String(v)
    if (typeof v === 'string') return v
    try { return JSON.stringify(v, null, 2) } catch (e) { return String(v) }
  },
  // NEW: success helper
  isSuccess(obj) {
    return obj && obj.status === 1
  },

  // NEW: try to convert Python-ish dict strings to proper JSON objects
  normalizeResult(obj) {
    if (!obj) return null
    var r = obj.result
    if (r === undefined || r === null) return null
    if (typeof r !== 'string') return r

    var s = r.trim()

    // First attempt: parse as JSON directly
    if ((s.charAt(0) === '{' || s.charAt(0) === '[')) {
      try { return JSON.parse(s) } catch (e) { /* continue */ }
    }

    // Second attempt: convert common Python repr -> JSON (best-effort)
    // Replaces single quotes with double quotes and Python literals to JSON.
    // This is conservative and works well for typical contract returns.
    try {
      var s2 = s
        .replace(/'/g, '"')
        .replace(/\bNone\b/g, 'null')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
      return JSON.parse(s2)
    } catch (e) {
      // Fallback: show raw string
      return s
    }
  },
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

        this.parseExportedFunctions()
        this.runner.visible = false

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
    '$route'() { this.fetchContract(this.$route.params.contract) },
    'contract.code'() { this.parseExportedFunctions() }
  }
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css');

.modern-page-contract {
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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* Error State */
.error-container,
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.error-icon,
.not-found-icon {
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
  padding: 2rem 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contract-content-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
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
.token-section,
.contract-details {
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

.address-link,
.token-link {
  color: #00d4ff;
  text-decoration: none;
  transition: color 0.3s ease;
}

.address-link:hover,
.token-link:hover {
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

.copy-code-button,
.fullscreen-button {
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

.copy-code-button:hover,
.fullscreen-button:hover {
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

/* Text Overflow Fixes */
.info-value,
.hash-value,
.address-value,
.url-value,
.long-text {
  hyphens: auto;
  max-width: 100%;
}

.info-row td,
.info-row .info-value {}

.code-block {
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

/* Responsive Design */
@media (max-width: 768px) {

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

  .copy-code-button,
  .fullscreen-button {
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
    text-overflow: ellipsis;
    overflow: hidden;
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

/* Code lines container (replaces single <pre>) */
.code-lines {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-x: auto;
}

.code-line {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  white-space: pre;
  padding-right: 108px; /* ⟵ space so long lines don't sit under the chip */
  /* important: no wrapping, keeps chip aligned */
}

.code-line+.code-line {
  margin-top: 0.15rem;
}

.run-chip {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%); /* center vertically on the line */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #e7e7e7;
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  backdrop-filter: blur(4px);
  opacity: 0; /* hide until hover (desktop) */
  transition: background .15s, border-color .15s, opacity .15s, transform .15s;
}

.code-line:hover .run-chip { opacity: 1; }
.run-chip:active { transform: translateY(-50%) scale(0.98); }

.run-chip__icon {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.18);
  display: grid;
  place-items: center;
  position: relative;
}
.run-chip__icon::before {
  content: "";
  width: 0; height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid #fff; /* the caret */
  margin-left: 2px;
}

/* Inline runner popover */
.inline-runner {
  margin: 0.5rem 0 0.75rem 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 0.75rem;
}

.inline-runner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .5rem;
}

.inline-runner-body label {
  display: block;
  font-size: 0.8rem;
  color: #8892b0;
  margin-top: .5rem;
  margin-bottom: .25rem;
}

.runner-input,
.runner-textarea {
  width: 100%;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
}

.runner-textarea {
  resize: vertical;
}

.inline-runner .runner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: .5rem;
}

.inline-runner .runner-btn {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: #0f1419;
  font-weight: 700;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
}

.inline-runner .runner-btn.small {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-weight: 600;
}

.mini-close {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.runner-out { margin-top: .5rem; }

.out-header {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: .5rem;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: .8rem;
  font-weight: 700;
  border: 1px solid transparent;
}
.badge.ok  { background: rgba(34,197,94,.15);  color: #86efac; border-color: rgba(34,197,94,.35); }
.badge.bad { background: rgba(239,68,68,.15);  color: #fca5a5; border-color: rgba(239,68,68,.35); }

.muted { color: #8b94a7; font-size: .9rem; }

.out-section { margin-top: .5rem; }
.out-title { font-weight: 700; margin: .25rem 0 .25rem 0; color: #e7e7e7; font-size: .95rem; }
.out-subtitle { font-weight: 600; margin: .5rem 0 .25rem 0; color: #cbd5e1; font-size: .9rem; }

.state-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: .25rem;
}
.state-table th, .state-table td {
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  padding: .35rem .4rem;
}
.state-table code { white-space: pre-wrap; word-break: break-word; }

.out-details summary {
  cursor: pointer;
  color: #9fb3c8;
  margin-top: .4rem;
}

.runner-pre {
  background: #141821;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  padding: 0.75rem;
  max-height: 360px;
  overflow: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
}

</style>