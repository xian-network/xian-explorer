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
        <div class="header-content-inner">
          <div class="header-content">
            <div class="header-main">
              <h1 class="page-title">
                {{ mainNameDisplay !== '—' ? mainNameDisplay : 'Address' }}
              </h1>
              <p class="page-description">
                Address information, balance, and transaction history
              </p>
            </div>
            
          </div>
        </div>
      </div>

      <!-- Address Content -->
      <div class="address-content-inner">
        <!-- Address Information -->
        <div class="address-info-section">
          <div class="info-card">
            <h3 class="card-title">Address Information</h3>
            <div class="card-content">
              <div class="info-row">
                <span class="info-label">XNS Name</span>
                <span class="info-value">{{ mainNameDisplay }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Address</span>
                <span class="info-value address-value">{{ $route.params.address }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">XIAN Balance</span>
                <span class="info-value balance-value">{{ wallet.balance }} XIAN</span>
              </div>
              <div class="info-row" v-if="tokenCount > 0">
                <span class="info-label">Token Holdings</span>
                <span class="info-value">{{ tokenCount }} token{{ tokenCount !== 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Token Holdings -->
        <div class="tokens-section">
          <div class="info-card">
            <h3 class="card-title">
              <span class="material-icons">toll</span>
              Token Holdings
            </h3>
            <div class="card-content">
              <div v-if="tokens.length > 0 && tokens[0].contract !== 'None'" class="table-container">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Symbol</th>
                      <th>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="token in tokens" :key="token.contract">
                      <td>
                        <div class="token-info">
                          <span class="token-name">{{ token.token_name || token.contract }}</span>
                          <span v-if="token.token_website" class="token-website">
                            <a :href="token.token_website" target="_blank" class="website-link">
                              <span class="material-icons">language</span>
                            </a>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span v-if="token.token_symbol" class="token-symbol">{{ token.token_symbol }}</span>
                        <span v-else class="no-symbol">—</span>
                      </td>
                      <td class="balance-cell">
                        <span class="balance-amount">{{ formatTokenBalance(token.balance) }}</span>
                      </td>
                      <td>
                        <router-link :to="{ name: 'token', params: { contract: token.contract } }" class="token-link">
                          View Token
                        </router-link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else-if="tokens.length === 1 && tokens[0].contract === 'None'" class="no-tokens">
                <div class="no-tokens-icon">🪙</div>
                <p>No token holdings found</p>
              </div>
              <div v-else class="loading-tokens">
                <div class="loading-spinner small"></div>
                <p>Loading token holdings...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Transaction History -->
        <div class="transactions-section">
          <div class="info-card">
            <h3 class="card-title">
              <span class="material-icons">receipt</span>
              Transaction History
            </h3>
            <div class="card-content">
              <div v-if="transactions.length > 0" class="table-container">
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
                    <tr v-for="tx in transactions" :key="tx.hash">
                      <td class="time-cell">
                        <div class="time-info">
                          <div class="time-main">{{ formatTime(tx.formattedTime) }}</div>
                          <div class="time-sub">{{ formatDate(tx.formattedTime) }}</div>
                        </div>
                      </td>
                      <td class="hash-cell">
                        <router-link :to="`/tx/${tx.hash}`" class="hash-link">
                          {{ shortenHash(tx.hash) }}
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
                    class="pagination-button"
                  >
                    <span class="material-icons">chevron_left</span>
                    Previous
                  </button>
                  <span class="page-info">Page {{ page }}</span>
                  <button 
                    @click="nextPage" 
                    :disabled="transactions.length < itemsPerPage"
                    class="pagination-button"
                  >
                    Next
                    <span class="material-icons">chevron_right</span>
                  </button>
                </div>
              </div>
              <div v-else-if="transactionsLoading" class="loading-transactions">
                <div class="loading-spinner small"></div>
                <p>Loading transactions...</p>
              </div>
              <div v-else class="no-transactions">
                <div class="no-transactions-icon">📋</div>
                <p>No transactions found</p>
              </div>
            </div>
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
  async mounted() {
    await this.loadAddressData();
  },
  watch: {
    '$route.params.address': {
      handler(newAddress) {
        if (newAddress) {
          this.loadAddressData();
        }
      },
      immediate: true
    }
  },
  methods: {
    async loadAddressData() {
      this.loading = true;
      this.error = null;
      
      try {
        await Promise.all([
          this.fetchStampRate(),
          this.fetchName(),
          this.fetchAddress(),
          this.fetchAllTokenBalances()
        ]);
        
        await this.fetchTransactions();
        
      } catch (error) {
        console.error('Error loading address data:', error);
        this.error = error.message || 'Failed to load address data';
      } finally {
        this.loading = false;
      }
    },

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
          formattedTime: new Date(Number(tx.blockTime) / 1e6).toLocaleString() ? new Date(Number(tx.blockTime) / 1e6) : null
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

      const tokenContracts = nodes.filter(node => node.xsc0001 === true).map(node => node.name);
      const tokenBalances = {};
      for (let contractName of tokenContracts) {
        if (balances[contractName]) {
          tokenBalances[contractName] = balances[contractName];
        }
      }

      if (Object.keys(tokenBalances).length === 0) {
        this.tokens = [{ contract: "None", balance: "None" }];
        return;
      }

      await this.fetchTokenMetadata(tokenBalances);
    },

    async fetchTokenMetadata(tokenBalances) {
      const contractNames = Object.keys(tokenBalances);
      const metadataKeys = [];
      for (let contractName of contractNames) {
        metadataKeys.push(`${contractName}.metadata:token_name`);
        metadataKeys.push(`${contractName}.metadata:token_symbol`);
        metadataKeys.push(`${contractName}.metadata:token_website`);
      }

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
      const variables = { keys: metadataKeys };

      const resp = await axios.post(this.blockchain.rpc + "/graphql", { query, variables });
      const rData = resp && resp.data;
      const dataPart = rData && rData.data;
      const allStates = dataPart && dataPart.allStates;
      const edges = (allStates && allStates.edges) ? allStates.edges : [];

      const metadata = {};
      for (let edge of edges) {
        if (!edge || !edge.node || !edge.node.key) continue;
        const fullKey = edge.node.key;
        const [contractPart, metadataPart] = fullKey.split(".metadata:");
        if (!metadata[contractPart]) {
          metadata[contractPart] = {};
        }
        metadata[contractPart][metadataPart] = edge.node.value;
      }

      const tokens = [];
      for (let contractName of contractNames) {
        const tokenInfo = {
          contract: contractName,
          balance: tokenBalances[contractName],
          token_name: metadata[contractName] ? metadata[contractName].token_name : null,
          token_symbol: metadata[contractName] ? metadata[contractName].token_symbol : null,
          token_website: metadata[contractName] ? metadata[contractName].token_website : null
        };
        tokens.push(tokenInfo);
      }

      this.tokens = tokens;
    }
  }
}
</script>

<style scoped>
.modern-page-address {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-spinner.small {
  width: 30px;
  height: 30px;
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

.xns-badge {
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

.copy-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.copy-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.1);
}

.copy-button.copied {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: white;
}

/* Content Container */
.address-content-inner {
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

.address-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
}

.balance-value {
  color: #00d4ff;
  font-weight: 600;
}

/* Tables */
.tokens-table-container, .transactions-table-container {
  overflow-x: auto;
}

.tokens-table, .transactions-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.tokens-table th, .transactions-table th {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 600;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.tokens-table td, .transactions-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.token-info {
  display: flex;
  gap: 0.5rem;
}

.token-name {
  font-weight: 600;
}

.token-symbol {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}

.no-symbol {
  color: #8892b0;
}

.balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #00d4ff;
  font-weight: 600;
}

.token-link, .hash-link {
  color: #00d4ff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.3s ease;
}

.token-link:hover, .hash-link:hover {
  color: #ffffff;
}

.website-link {
  color: #8892b0;
  text-decoration: none;
  transition: color 0.3s ease;
}

.website-link:hover {
  color: #00d4ff;
}

.time-info {
  display: flex;
  flex-direction: column;
}

.time-main {
  font-weight: 600;
}

.time-sub {
  font-size: 0.875rem;
  color: #8892b0;
}

.contract-name, .function-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
}

.fee-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.fee-xian {
  font-weight: 600;
  color: #00d4ff;
}

.fee-stamps {
  font-size: 0.875rem;
  color: #8892b0;
}

/* No Data States */
.no-tokens, .no-transactions, .loading-tokens, .loading-transactions {
  text-align: center;
  padding: 3rem 1rem;
  color: #8892b0;
}

.no-tokens-icon, .no-transactions-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding:1rem 0.5rem;
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
.info-value, .address-value, .token-name, .contract-name, .function-name {
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modern-page-address {
    padding: 0;
  }

  .header-content-inner {
    padding: 1.5rem;
  }

  .address-content-inner {
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

  .tokens-table, .transactions-table {
    font-size: 0.875rem;
  }

  .tokens-table th, .transactions-table th,
  .tokens-table td, .transactions-table td {
    padding: 0.75rem 0.5rem;
  }

  .pagination {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
<style lang="stylus" scoped>
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
// Responsive Design
@media (max-width: 768px)
  .modern-table
    thead th
      padding 1rem
      font-size 0.75rem
    
    tbody td
      padding 1rem
</style>