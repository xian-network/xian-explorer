<template>
  <div class="modern-page-tx">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading transaction details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Transaction</h3>
      <p>{{ error }}</p>
      <button @click="fetchTransactionData" class="retry-button">Try Again</button>
    </div>

    <!-- Transaction Not Found -->
    <div v-else-if="!decodedTx" class="not-found-container">
      <div class="not-found-icon">🔍</div>
      <h3>Transaction Not Found</h3>
      <p>The transaction with hash {{ hash }} could not be found.</p>
    </div>

    <!-- Transaction Content -->
    <div v-else class="transaction-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-main">
            <h1 class="page-title">Transaction Details</h1>
            <p class="page-description">
              Complete information about this transaction
            </p>
          </div>
          <div class="header-actions">
            <router-link :to="`/blocks/${height}`" class="block-button">
              <span class="material-icons">chevron_left</span>
              Block {{ height }}
            </router-link>
            <a :href="jsonUrl" target="_blank" class="json-button">
              <span class="material-icons">code</span>
              JSON
            </a>
          </div>
        </div>
      </div>

      <!-- Transaction Information Cards -->
      <div class="transaction-content-inner">
        <div class="info-cards">
        <!-- Basic Info Card -->
        <div class="info-card">
          <h3 class="card-title">Transaction Information</h3>
          <div class="card-content">
            <div class="info-row">
              <span class="info-label">Hash</span>
              <div class="info-value-with-copy">
                <span class="info-value hash-value">{{ formatHash(decodedTx.txHash) }}</span>
                <button @click="copyToClipboard(decodedTx.txHash)" class="copy-button" title="Copy to clipboard">
                  <span class="material-icons">content_copy</span>
                </button>
              </div>
            </div>
            <div class="info-row">
              <span class="info-label">Block Height</span>
              <router-link :to="`/blocks/${height}`" class="info-value block-link">
                {{ height.toLocaleString() }}
              </router-link>
            </div>
            <div class="info-row">
              <span class="info-label">Timestamp</span>
              <span class="info-value">{{ formatDate(decodedTx.txTimestamp) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Sender</span>
              <router-link :to="`/addresses/${decodedTx.payload.sender}`" class="info-value address-link">
                {{ senderDisplay }}
              </router-link>
            </div>
          </div>
        </div>

        <!-- Result Card -->
        <div class="info-card">
          <h3 class="card-title">Transaction Result</h3>
          <div class="card-content">
            <div class="info-row">
              <span class="info-label">Status</span>
              <div class="info-value">
                <span v-if="decodedTx.txResult.success" class="status-badge success">
                  <span class="material-icons">check_circle</span>
                  Success
                </span>
                <span v-else class="status-badge failed">
                  <span class="material-icons">cancel</span>
                  Failed
                </span>
              </div>
            </div>
            <div class="info-row">
              <span class="info-label">Fee</span>
              <div class="info-value fee-display">
                <div class="xian-fee">{{ feeXian }} XIAN</div>
                <div class="stamps">{{ decodedTx.txResult.stampsUsed }} stamps</div>
              </div>
            </div>
            <div class="info-row" v-if="decodedTx.txResult.data.result">
              <span class="info-label">Result</span>
              <span class="info-value result-value">{{ decodedTx.txResult.data.result }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Signature</span>
              <span class="info-value hash-value">{{ formatHash(decodedTx.metadata.signature) }}</span>
            </div>
          </div>
        </div>

        <!-- Request Details Card -->
        <div class="info-card">
          <h3 class="card-title">Transaction Request</h3>
          <div class="card-content">
            <div class="info-row">
              <span class="info-label">Contract</span>
              <router-link :to="`/contracts/${decodedTx.payload.contract}`" class="info-value contract-link">
                {{ decodedTx.payload.contract }}
              </router-link>
            </div>
            <div class="info-row">
              <span class="info-label">Function</span>
              <span class="info-value function-name">{{ decodedTx.payload.function }}</span>
            </div>
            <div class="info-row" v-if="decodedTx.payload.kwargs">
              <span class="info-label">Arguments</span>
              <div class="info-value">
                <pre class="arguments-display">{{ formatArguments(decodedTx.payload.kwargs) }}</pre>
              </div>
            </div>
            <div class="info-row">
              <span class="info-label">Nonce</span>
              <span class="info-value">{{ decodedTx.payload.nonce }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Stamps Supplied</span>
              <span class="info-value">{{ decodedTx.payload.stamps_supplied.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Expandable Sections -->
      <div class="expandable-sections">
        <!-- Rewards Section -->
        <div v-if="decodedTx.txResult.data.mergedRewards && decodedTx.txResult.data.mergedRewards.length > 0" class="expandable-section">
          <button @click="toggleSection('rewards')" class="section-header">
            <h3 class="section-title">
              Rewards ({{ decodedTx.txResult.data.mergedRewards.length }})
            </h3>
            <span class="material-icons expand-icon" :class="{ expanded: expandedSections.rewards }">
              expand_more
            </span>
          </button>
          <div v-show="expandedSections.rewards" class="section-content">
            <div class="rewards-grid">
              <div v-for="(reward, index) in decodedTx.txResult.data.mergedRewards" :key="index" class="reward-item">
                <div class="reward-header">
                  <span class="reward-type-badge" :class="`badge-${reward.type}`">
                    {{ reward.type }}
                  </span>
                  <span class="reward-amount">{{ reward.amount }} XIAN</span>
                </div>
                <router-link :to="`/addresses/${reward.address}`" class="reward-address">
                  {{ formatHash(reward.address) }}
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Events Section -->
        <div v-if="decodedTx.txResult.data.events && decodedTx.txResult.data.events.length > 0" class="expandable-section">
          <button @click="toggleSection('events')" class="section-header">
            <h3 class="section-title">
              Events ({{ decodedTx.txResult.data.events.length }})
            </h3>
            <span class="material-icons expand-icon" :class="{ expanded: expandedSections.events }">
              expand_more
            </span>
          </button>
          <div v-show="expandedSections.events" class="section-content">
            <div class="events-list">
              <div v-for="(event, index) in decodedTx.txResult.data.events" :key="index" class="event-item">
                <div class="event-header">
                  <span class="event-index">Event {{ index + 1 }}</span>
                </div>
                <pre class="event-content">{{ formatEventData(event) }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- State Changes Section -->
        <div v-if="decodedTx.txResult.data.state && decodedTx.txResult.data.state.length > 0" class="expandable-section">
          <button @click="toggleSection('state')" class="section-header">
            <h3 class="section-title">
              State Changes ({{ decodedTx.txResult.data.state.length }})
            </h3>
            <span class="material-icons expand-icon" :class="{ expanded: expandedSections.state }">
              expand_more
            </span>
          </button>
          <div v-show="expandedSections.state" class="section-content">
            <div class="state-list">
              <div v-for="(state, index) in decodedTx.txResult.data.state" :key="index" class="state-item">
                <div class="state-header">
                  <span class="state-index">State {{ index + 1 }}</span>
                </div>
                <pre class="state-content">{{ formatStateData(state) }}</pre>
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
import { decodeTx, decodeData } from "../scripts/tx"

export default {
  name: "ModernPageTx",
  computed: {
    ...mapGetters(["blockchain"]),
    feeXian() {
      if (!this.decodedTx || !this.stampRate) return "—";
      return (this.decodedTx.txResult.stampsUsed / this.stampRate).toFixed(3);
    },
    hash() {
      return this.$route.params.hash;
    },
    decodedTx() {
      if (!this.tx || !this.timestamp) return null;

      let txObj = decodeTx(this.tx);
      let txHash = this.hash;
      let txTimestamp = this.timestamp;
      txObj = Object.assign({ txTimestamp }, txObj);

      let txResult = this.tx_result;
      txResult.success = txResult.code === 0;

      // Clean up txResult
      delete txResult.code;
      delete txResult.log;
      delete txResult.info;
      delete txResult.gas_wanted;
      delete txResult.gas_used;
      delete txResult.events;
      delete txResult.codespace;

      // Decode additional data
      txResult.data = decodeData(txResult.data);
      txResult.stampsUsed = txResult.data.stamps_used;
      txResult.rewards = {};

      if (!txResult.data.rewards) {
        txResult.data.rewards = {
          foundation_reward: {},
          masternode_reward: {},
          developer_reward: {}
        };
      } else {
        txResult.rewards.foundation_reward = Object.entries(txResult.data.rewards.foundation_reward).map(([k, v]) => ({ address: k, amount: v }));
        txResult.rewards.validator_reward = Object.entries(txResult.data.rewards.masternode_reward).map(([k, v]) => ({ validator: k, amount: v }));
        txResult.rewards.developer_reward = Object.entries(txResult.data.rewards.developer_reward).map(([k, v]) => ({ developer: k, amount: v }));
      }

      // Merge all reward types into one array
      try {
        txResult.data.mergedRewards = txResult.rewards.foundation_reward
          .concat(txResult.rewards.validator_reward, txResult.rewards.developer_reward)
          .map(reward => ({
            address: reward.address || reward.validator || reward.developer,
            amount: Number(reward.amount),
            type: reward.developer ? 'developer' : (reward.validator ? 'validator' : 'foundation')
          }));
      } catch (e) {
        console.error("Error merging rewards", e);
        txResult.data.mergedRewards = [];
      }

      delete txResult.data.rewards;
      delete txResult.data.stamps_used;
      delete txResult.data.status;
      delete txResult.data.hash;

      let state = txResult.data.state;
      delete txResult.data.state;
      txResult.data.state = state;

      let block = {
        isRouterLink: true,
        title: "View block details",
        text: this.height,
        to: { name: "block", params: { block: this.height } }
      };
      
      return Object.assign({ txResult, block, txHash }, txObj);
    },
    senderDisplay() {
      if (this.senderName) {
        return this.senderName
      } else if (this.decodedTx && this.decodedTx.payload && this.decodedTx.payload.sender) {
        return this.formatHash(this.decodedTx.payload.sender)
      }
      return ""
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      jsonUrl: "",
      tx: null,
      tx_result: null,
      height: "",
      timestamp: "",
      senderName: "",
      stampRate: null,
      expandedSections: {
        rewards: false,
        events: false,
        state: false
      }
    }
  },
  methods: {
    async fetchStampRate() {
      try {
        const r = await fetch(
          this.blockchain.rpc + '/abci_query?path="/get/stamp_cost.S:value"'
        );
        const v = (await r.json()).result.response.value;
        this.stampRate = v === "AA==" ? null : parseInt(atob(v), 10);
      } catch (e) {
        console.error("stamp‑rate fetch failed", e);
      }
    },
    formatDate(date) {
      if (!date) return '—'
      return new Date(date).toLocaleString();
    },
    formatHash(hash) {
      if (!hash) return '—'
      return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
    },
    formatArguments(kwargs) {
      if (!kwargs) return '—'
      try {
        return JSON.stringify(kwargs, null, 2)
      } catch (e) {
        return kwargs.toString()
      }
    },
    formatEventData(event) {
      try {
        return JSON.stringify(event, null, 2)
      } catch (e) {
        return event.toString()
      }
    },
    formatStateData(state) {
      try {
        return JSON.stringify(state, null, 2)
      } catch (e) {
        return state.toString()
      }
    },
    toggleSection(section) {
      this.expandedSections[section] = !this.expandedSections[section]
    },
    copyToClipboard(text) {
      if (!text) return;

      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            // You could add a toast notification here
            console.log("Copied to clipboard:", text);
          })
          .catch(err => {
            console.error("Clipboard copy failed", err);
            this.fallbackCopyTextToClipboard(text);
          });
      } else {
        this.fallbackCopyTextToClipboard(text);
      }
    },
    fallbackCopyTextToClipboard(text) {
      let tempInput = document.createElement("textarea");
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      console.log("Copied to clipboard (fallback method):", text);
    },
    async fetchTx() {
      try {
        this.jsonUrl = `${this.blockchain.rpc}/tx?hash=0x${this.hash}`;
        let json = await axios.get(this.jsonUrl);
        this.height = json.data.result.height;
        this.tx = json.data.result.tx;
        this.tx_result = json.data.result.tx_result;
      } catch (error) {
        console.error("Error fetching transaction data:", error);
        throw error;
      }
    },
    async fetchBlockTimestamp() {
      try {
        if (this.height) {
          let json = await axios.get(`${this.blockchain.rpc}/block?height=${this.height}`);
          if (json.data && json.data.result) {
            this.timestamp = json.data.result.block.header.time || "";
          }
        }
      } catch (error) {
        console.error("Error fetching block timestamp:", error);
        this.timestamp = "";
      }
    },
    async fetchTransactionData() {
      try {
        this.loading = true;
        this.error = null;
        
        await this.fetchTx();
        await this.fetchBlockTimestamp();
        
        // Try resolve XNS for sender
        if (this.tx) {
          const txObj = decodeTx(this.tx)
          const addr = (txObj.payload && txObj.payload.sender) ? txObj.payload.sender : ""
          this.senderName = await this.resolveXnsName(addr)
        }
        
        this.loading = false;
      } catch (error) {
        console.error('Error fetching transaction:', error)
        this.error = 'Failed to load transaction data. Please try again.'
        this.loading = false
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
        const j = await resp.json()
        if (!j.result || !j.result.response || !j.result.response.value) return ""
        let decoded = JSON.parse(atob(j.result.response.value))
        if (decoded.status !== 1 && decoded.result && decoded.result !== "None") {
          return decoded.result.replace(/'/g, "")
        }
      } catch (err) {
        console.error("Name resolution error:", err)
      }
      return ""
    }
  },
  async mounted() {
    await this.fetchStampRate();
    await this.fetchTransactionData();
  },
  watch: {
    '$route'() {
      this.fetchTransactionData();
    }
  }
}
</script>

<style scoped>
.modern-page-tx {
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
  background: rgba(255, 255, 255, 0.02);
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

.transaction-content-inner {
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
}

.page-description {
  color: #8892b0;
  font-size: 1.1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.block-button, .json-button {
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

.block-button:hover, .json-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
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
  word-break: break-word;
}

.info-value-with-copy {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
}

.copy-button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #8892b0;
  padding: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.copy-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.copy-button .material-icons {
  font-size: 16px;
}

.hash-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #00d4ff;
}

.block-link, .address-link, .contract-link {
  color: #00d4ff;
  text-decoration: none;
  transition: color 0.3s ease;
}

.block-link:hover, .address-link:hover, .contract-link:hover {
  color: #ffffff;
}

.function-name {
  color: #00ff88;
  font-family: 'JetBrains Mono', monospace;
}

.result-value {
  color: #00ff88;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
}

.arguments-display {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: #8892b0;
  margin: 0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Status Badge */
.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.875rem;
}

.status-badge.success {
  background: rgba(0, 255, 136, 0.2);
  color: #00ff88;
}

.status-badge.failed {
  background: rgba(255, 82, 82, 0.2);
  color: #ff5252;
}

.status-badge .material-icons {
  font-size: 18px;
}

/* Fee Display */
.fee-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.xian-fee {
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
}

.stamps {
  color: #8892b0;
  font-size: 0.875rem;
}

/* Expandable Sections */
.expandable-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.expandable-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  width: 100%;
  background: none;
  border: none;
  color: #ffffff;
  padding: 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s ease;
}

.section-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.expand-icon {
  transition: transform 0.3s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.section-content {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

/* Rewards */
.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.reward-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.reward-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.reward-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-foundation {
  background: rgba(0, 123, 255, 0.2);
  color: #007bff;
}

.badge-validator {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.badge-developer {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.reward-amount {
  color: #00ff88;
  font-weight: 600;
}

.reward-address {
  color: #00d4ff;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.reward-address:hover {
  color: #ffffff;
}

/* Events and State */
.events-list, .state-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-item, .state-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
}

.event-header, .state-header {
  margin-bottom: 0.75rem;
}

.event-index, .state-index {
  color: #00d4ff;
  font-weight: 600;
  font-size: 0.875rem;
}

.event-content, .state-content {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: #8892b0;
  margin: 0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Text Overflow Fixes */
.info-value, .hash-value, .address-value, .url-value, .long-text {
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
}

.info-row td, .info-row .info-value {
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 0;
  min-width: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modern-page-tx {
    padding: 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .block-button, .json-button {
    flex: 1;
    justify-content: center;
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

  .info-value-with-copy {
    justify-content: flex-start;
  }

  .fee-display {
    align-items: flex-start;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
  }
}
</style>