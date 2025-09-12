<template>
  <div class="modern-page-address">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading address details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3>Error Loading Address</h3>
      <p>{{ error }}</p>
      <button @click="loadAddressData" class="retry-button">Try Again</button>
    </div>

    <!-- Address Content -->
    <div v-else class="address-content">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-main">
            <h1 class="page-title">
              {{ mainNameDisplay !== '—' ? mainNameDisplay : 'Address' }}
              <span v-if="mainNameDisplay !== '—'" class="xns-badge">XNS</span>
            </h1>
            <p class="page-description">
              Address information, balance, and transaction history
            </p>
            <div class="address-display">
              <span class="address-text">{{ $route.params.address }}</span>
              <button @click="copyAddress" class="copy-button" :class="{ copied: addressCopied }">
                <span class="material-icons">{{ addressCopied ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
          </div>
          <div class="header-stats">
            <div class="stat-card">
              <div class="stat-value">{{ wallet.balance }}</div>
              <div class="stat-label">XIAN Balance</div>
            </div>
            <div class="stat-card" v-if="tokenCount > 0">
              <div class="stat-value">{{ tokenCount }}</div>
              <div class="stat-label">Token{{ tokenCount !== 1 ? 's' : '' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Address Details -->
      <div class="details-section">
        <div class="info-card">
          <h3 class="card-title">
            <span class="material-icons">account_balance_wallet</span>
            Address Details
          </h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">XNS Name</span>
              <span class="info-value">{{ mainNameDisplay }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Address</span>
              <span class="info-value address-value">
                {{ $route.params.address }}
                <button @click="copyAddress" class="copy-button-small" :class="{ copied: addressCopied }">
                  <span class="material-icons">{{ addressCopied ? 'check' : 'content_copy' }}</span>
                </button>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">XIAN Balance</span>
              <span class="info-value balance-value">{{ wallet.balance }} XIAN</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Token Holdings -->
      <div v-if="tokens.length > 0 && tokens[0].contract !== 'None'" class="tokens-section">
        <div class="info-card">
          <h3 class="card-title">
            <span class="material-icons">toll</span>
            Token Holdings
          </h3>
          <div class="tokens-grid">
            <div v-for="token in tokens" :key="token.contract" class="token-card">
              <div class="token-header">
                <div class="token-info">
                  <h4 class="token-name">{{ token.token_name || token.contract }}</h4>
                  <span v-if="token.token_symbol" class="token-symbol">{{ token.token_symbol }}</span>
                </div>
                <router-link :to="{ name: 'token', params: { token: token.contract } }" class="token-link">
                  <span class="material-icons">open_in_new</span>
                </router-link>
              </div>
              <div class="token-balance">{{ formatTokenBalance(token.balance) }}</div>
              <div v-if="token.token_website" class="token-website">
                <a :href="token.token_website" target="_blank" class="website-link">
                  <span class="material-icons">language</span>
                  Website
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Tokens State -->
      <div v-else-if="tokens.length === 1 && tokens[0].contract === 'None'" class="tokens-section">
        <div class="info-card">
          <h3 class="card-title">
            <span class="material-icons">toll</span>
            Token Holdings
          </h3>
          <div class="empty-state">
            <div class="empty-icon">🪙</div>
            <p>No token holdings found</p>
          </div>
        </div>
      </div>

      <!-- Loading Tokens State -->
      <div v-else-if="tokens.length === 0" class="tokens-section">
        <div class="info-card">
          <h3 class="card-title">
            <span class="material-icons">toll</span>
            Token Holdings
          </h3>
          <div class="loading-state">
            <div class="loading-spinner small"></div>
            <p>Loading token holdings...</p>
          </div>
        </div>
      </div>

      <!-- Transactions -->
      <div class="transactions-section">
        <div class="info-card">
          <h3 class="card-title">
            <span class="material-icons">receipt_long</span>
            Transaction History
          </h3>
          <div v-if="transactions.length > 0" class="transactions-table-container">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Transaction</th>
                  <th>Contract</th>
                  <th>Function</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in transactions" :key="tx.hash" class="transaction-row">
                  <td class="time-cell">
                    <div class="time-info">
                      <div class="time-main">{{ formatTime(tx.formattedTime) }}</div>
                      <div class="time-sub">{{ formatDate(tx.formattedTime) }}</div>
                    </div>
                  </td>
                  <td class="hash-cell">
                    <router-link :to="`/tx/${tx.hash}`" class="hash-link">
                      {{ shortenHash(tx.hash) }}
                      <span class="material-icons">open_in_new</span>
                    </router-link>
                  </td>
                  <td class="contract-cell">
                    <span class="contract-name">{{ shortenText(tx.contract) }}</span>
                  </td>
                  <td class="function-cell">
                    <span class="function-name">{{ shortenText(tx.function) }}</span>
                  </td>
                  <td class="fee-cell">
                    <div class="fee-info">
                      <div class="fee-xian">{{ tx.feeXian }} XIAN</div>
                      <div class="fee-stamps">{{ tx.stamps }} stamps</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <!-- Pagination -->
            <div class="pagination">
              <button 
                @click="prevPage" 
                :disabled="page === 1"
                class="pagination-button prev-button">
                <span class="material-icons">chevron_left</span>
                Previous
              </button>
              <span class="page-info">Page {{ page }}</span>
              <button 
                @click="nextPage" 
                :disabled="transactions.length < itemsPerPage"
                class="pagination-button next-button">
                Next
                <span class="material-icons">chevron_right</span>
              </button>
            </div>
          </div>
          <div v-else-if="transactionsLoading" class="loading-state">
            <div class="loading-spinner small"></div>
            <p>Loading transactions...</p>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">📋</div>
            <p>No transactions found</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import axios from "axios";

function toHexString(bytes) {
  return Array.from(bytes)
    .map((x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

async function execute_get_address_to_main_name(address, rpc) {
  const payload = {
    sender: "",
    contract: "con_name_service_final",
    function: "get_address_to_main_name",
    kwargs: { address }
  };

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hex = toHexString(bytes);

  const response = await fetch(`${rpc}/abci_query?path="/simulate_tx/${hex}"`);
  const data = await response.json();

  let decoded = "";
  if (data.result.response.value) {
    decoded = atob(data.result.response.value);
  }
  if (!decoded || decoded === "ée" || decoded === "AA==") {
    return "None";
  }
  decoded = JSON.parse(decoded);
  if (decoded.status === 1) {
    return "None";
  }
  return decoded.result.replaceAll("'", "");
}

export default {
  name: "modern-page-address",
  data: () => ({
    loading: true,
    error: null,
    transactionsLoading: false,
    wallet: { balance: 0 },
    tokens: [],
    transactions: [],
    page: 1,
    itemsPerPage: 10,
    mainName: null,
    stampRate: null,
    addressCopied: false
  }),
  computed: {
    ...mapGetters(["blockchain"]),
    mainNameDisplay() {
      if (!this.mainName || this.mainName === "None") {
        return "—";
      }
      return this.mainName;
    },
    tokenCount() {
      if (this.tokens.length === 1 && this.tokens[0].contract === 'None') {
        return 0;
      }
      return this.tokens.length;
    }
  },
  methods: {
    async copyAddress() {
      try {
        await navigator.clipboard.writeText(this.$route.params.address);
        this.addressCopied = true;
        setTimeout(() => {
          this.addressCopied = false;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    },

    formatTokenBalance(balance) {
      const num = parseFloat(balance);
      if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
      if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
      return num.toFixed(8);
    },

    formatTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    },

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

    shortenHash(hash) {
      return hash ? hash.substring(0, 12) + "..." + hash.slice(-4) : "N/A";
    },

    shortenText(text) {
      if (!text) return "";
      return text.length > 20 ? text.substring(0, 20) + "..." : text;
    },

    formattedTokenName(token) {
      var display = token.token_name || token.contract;
      if (token.token_symbol) {
        display += ` (${token.token_symbol})`;
      }
      return display;
    },

    async fetchName() {
      const addr = this.$route.params.address;
      this.mainName = await execute_get_address_to_main_name(
        addr,
        this.blockchain.rpc
      );
    },

    async fetchAddress() {
      const query = `
        query MyQuery($address: String!) {
          allStates(
            filter: {
              and: {
                key: { startsWith: $address, notLike: "%:%:%" }
              }
            }
          ) {
            edges {
              node {
                value
              }
            }
          }
        }
      `;
      const addressKey = "currency.balances:" + this.$route.params.address;

      const response = await axios.post(
        this.blockchain.rpc + "/graphql",
        {
          query,
          variables: { address: addressKey }
        }
      );

      const respData = response && response.data;
      const dataPart = respData && respData.data;
      const allStates = dataPart && dataPart.allStates;
      const edges = (allStates && allStates.edges) ? allStates.edges : [];

      let numericBalance = 0;
      if (edges.length > 0 && edges[0].node && edges[0].node.value) {
        numericBalance = parseFloat(edges[0].node.value);
      }
      this.wallet.balance = numericBalance.toFixed(8);
    },

    async fetchTransactions() {
      this.transactionsLoading = true;
      const offset = (this.page - 1) * this.itemsPerPage;
      const fetchBatchSize = this.itemsPerPage * 2;
      let uniqueTransactions = [];
      let seenHashes = new Set();
      let currentOffset = offset;

      while (uniqueTransactions.length < this.itemsPerPage) {
        const query = `
          query MyQuery($address: String!, $offset: Int!, $batchSize: Int!) {
            allStateChanges(
              filter: { key: { includes: $address }, txHash: { notEqualTo: "GENESIS"}}
              first: $batchSize
              offset: $offset
              orderBy: CREATED_DESC
            ) {
              edges {
                node {
                  transactionByTxHash {
                    blockTime
                    blockHeight
                    contract
                    stamps
                    success
                    function
                    hash
                  }
                }
              }
            }
          }
        `;

        const variables = {
          address: this.$route.params.address,
          offset: currentOffset,
          batchSize: fetchBatchSize
        };

        const response = await axios.post(
          this.blockchain.rpc + "/graphql",
          {
            query,
            variables
          }
        );

        const rData = response && response.data;
        const rDataPart = rData && rData.data;
        const allStateChanges = rDataPart && rDataPart.allStateChanges;
        const edges = (allStateChanges && allStateChanges.edges) ? allStateChanges.edges : [];

        const newTxs = edges
          .map(edge => {
            return edge.node && edge.node.transactionByTxHash;
          })
          .filter(tx => tx && tx.hash);

        for (let tx of newTxs) {
          if (!seenHashes.has(tx.hash)) {
            uniqueTransactions.push(tx);
            seenHashes.add(tx.hash);
          }
        }

        if (newTxs.length < fetchBatchSize) {
          break;
        }
        currentOffset += fetchBatchSize;
      }

      const finalTxs = uniqueTransactions
        .slice(0, this.itemsPerPage)
        .map(tx => ({
          ...tx,
          feeXian: this.stampRate
            ? (tx.stamps / this.stampRate).toFixed(3)
            : "—",
          formattedTime: new Date(Number(tx.blockTime) / 1e6).toLocaleString()
        }));
      this.transactions = finalTxs;
      this.transactionsLoading = false;
    },

    nextPage() {
      if (this.transactions.length >= this.itemsPerPage) {
        this.page++;
        this.fetchTransactions();
      }
    },

    prevPage() {
      if (this.page > 1) {
        this.page--;
        this.fetchTransactions();
      }
    },

    async fetchAllTokenBalances() {
      const userAddr = this.$route.params.address;
      const query = `
        query UserBalances($address: String!) {
          allStates(
            filter: {
              key: { endsWith: $address }
              valueNumeric: { greaterThan: "0" }
            }
          ) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      `;
      const variables = { address: userAddr };

      const resp = await axios.post(this.blockchain.rpc + "/graphql", { query, variables });
      const rData = resp && resp.data;
      const dataPart = rData && rData.data;
      const allStates = dataPart && dataPart.allStates;
      const edges = (allStates && allStates.edges) ? allStates.edges : [];

      const balances = {};
      for (let edge of edges) {
        if (!edge || !edge.node || !edge.node.key) continue;
        const fullKey = edge.node.key;
        const [maybeContract, suffix] = fullKey.split(".balances:");
        if (suffix === userAddr) {
          const contractName = maybeContract.trim();
          const balanceValue = parseFloat(edge.node.value);
          if (contractName !== "currency" && balanceValue > 0) {
            balances[contractName] = balanceValue;
          }
        }
      }

      const contractNames = Object.keys(balances);
      if (contractNames.length === 0) {
        this.tokens = [{ contract: "None", balance: "None" }];
        return;
      }

      await this.fetchWhichAreTokens(balances, contractNames);
    },

    async fetchWhichAreTokens(balances, contractNames) {
      const query = `
        query TokenContracts($names: [String!]!) {
          allContracts(filter: { name: { in: $names } }) {
            nodes {
              name
              xsc0001
            }
          }
        }
      `;
      const variables = { names: contractNames };

      const resp = await axios.post(this.blockchain.rpc + "/graphql", { query, variables });
      const rData = resp && resp.data;
      const dataPart = rData && rData.data;
      const allContracts = dataPart && dataPart.allContracts;
      const nodes = (allContracts && allContracts.nodes) ? allContracts.nodes : [];

      const contractMap = {};
      nodes.forEach(({ name, xsc0001 }) => {
        contractMap[name] = !!xsc0001;
      });

      const realTokenContracts = Object.keys(balances).filter(
        (c) => contractMap[c] === true
      );

      if (realTokenContracts.length === 0) {
        this.tokens = [{ contract: "None", balance: "None" }];
        return;
      }

      await this.fetchTokenMetadata(balances, realTokenContracts);
    },

    async fetchTokenMetadata(balances, tokenContracts) {
      const metaFields = ["token_name", "token_symbol", "token_website", "operator"];
      const allMetadataKeys = [];

      tokenContracts.forEach((contract) => {
        metaFields.forEach((field) => {
          allMetadataKeys.push(`${contract}.metadata:${field}`);
        });
      });

      const query = `
        query TokenMetadata($keys: [String!]!) {
          allStates(filter: { key: { in: $keys } }) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      `;
      const variables = { keys: allMetadataKeys };

      const resp = await axios.post(this.blockchain.rpc + "/graphql", { query, variables });
      const rData = resp && resp.data;
      const dataPart = rData && rData.data;
      const allStates = dataPart && dataPart.allStates;
      const edges = (allStates && allStates.edges) ? allStates.edges : [];

      const metadataMap = {};
      for (let edge of edges) {
        if (!edge || !edge.node || !edge.node.key) continue;
        const fullKey = edge.node.key;
        const [contractDotMeta, field] = fullKey.split(":");
        const contractName = contractDotMeta.replace(".metadata", "");
        if (!metadataMap[contractName]) {
          metadataMap[contractName] = {};
        }
        metadataMap[contractName][field] = edge.node.value;
      }

      const finalTokens = tokenContracts.map((contract) => {
        const meta = metadataMap[contract] || {};
        return {
          contract,
          balance: balances[contract],
          token_name: meta.token_name || contract,
          token_symbol: meta.token_symbol || "",
          token_website: meta.token_website || "",
          operator: meta.operator || ""
        };
      });

      finalTokens.sort((a, b) => (a.token_name > b.token_name ? 1 : -1));
      this.tokens = finalTokens;
    },

    async loadAddressData() {
      this.loading = true;
      this.error = null;
      
      try {
        await this.fetchStampRate();
        await this.fetchName();
        await this.fetchAddress();
        await this.fetchTransactions();
        await this.fetchAllTokenBalances();
        this.loading = false;
      } catch (err) {
        console.error("Error loading address data:", err);
        this.error = "Failed to load address data. Please try again.";
        this.loading = false;
      }
    }
  },

  async mounted() {
    await this.loadAddressData();
  }
};
</script>

<style scoped>
.modern-page-address {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading States */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
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

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
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

/* Header */
.page-header {
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.xns-badge {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}

.page-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.125rem;
  margin: 0 0 1rem 0;
}

.address-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.address-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  word-break: break-all;
}

.copy-button, .copy-button-small {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button-small {
  padding: 0.25rem;
  margin-left: 0.5rem;
}

.copy-button:hover, .copy-button-small:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #00d4ff;
}

.copy-button.copied, .copy-button-small.copied {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.header-stats {
  display: flex;
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 120px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #00d4ff;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  font-weight: 500;
}

/* Content */
.address-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.details-section, .tokens-section, .transactions-section {
  margin-bottom: 2rem;
}

.info-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-title .material-icons {
  color: #00d4ff;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
}

.address-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  display: flex;
  align-items: center;
  word-break: break-all;
}

.balance-value {
  color: #00d4ff;
}

/* Token Cards */
.tokens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.token-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.token-card:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.token-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.token-info {
  flex: 1;
}

.token-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: white;
}

.token-symbol {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.token-link {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.token-link:hover {
  color: #00d4ff;
  background: rgba(255, 255, 255, 0.1);
}

.token-balance {
  font-size: 1.25rem;
  font-weight: 700;
  color: #00d4ff;
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.5rem;
}

.token-website {
  margin-top: 0.5rem;
}

.website-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.3s ease;
}

.website-link:hover {
  color: #00d4ff;
}

/* Tables */
.modern-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.modern-table th {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modern-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.modern-table tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* Transaction specific styles */
.time-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-main {
  font-weight: 600;
  color: white;
}

.time-sub {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.hash-link {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #00d4ff;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  transition: color 0.3s ease;
}

.hash-link:hover {
  color: #33e0ff;
}

.contract-name, .function-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.fee-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.fee-xian {
  font-weight: 600;
  color: #00d4ff;
}

.fee-stamps {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.pagination-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.pagination-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.page-info {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

/* Empty States */
.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .page-title {
    font-size: 2rem;
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .header-stats {
    width: 100%;
    justify-content: center;
  }

  .address-content {
    padding: 1rem;
  }

  .info-card {
    padding: 1.5rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .tokens-grid {
    grid-template-columns: 1fr;
  }

  .modern-table {
    font-size: 0.875rem;
  }

  .modern-table th,
  .modern-table td {
    padding: 0.75rem 0.5rem;
  }

  .pagination {
    flex-direction: column;
    gap: 0.5rem;
  }

  .address-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .address-text {
    word-break: break-all;
  }
}
</style>