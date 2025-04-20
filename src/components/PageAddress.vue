<template lang="pug">
  tm-page(:title="`Address: ${$route.params.address}`")
    div(slot="menu"): tm-tool-bar
  
    div
      tm-part(title="Address Details")
        tm-list-item(dt="XNS Name" :dd="mainNameDisplay")
        tm-list-item(dt="Address" :dd="$route.params.address")
        tm-list-item(dt="Balance" :dd="wallet.balance + ' XIAN'")
  
    // --------------------------------
    // Token Holdings
    // --------------------------------
    div
      tm-part(title="Token Holdings" v-if="tokens.length > 0 && tokens[0].contract !== 'None'")
        tm-list-item(
          v-for="token in tokens"
          :key="token.contract"
          :dt="formattedTokenName(token)"
          :dd="token.balance"
          :to="{ name: 'contract', params: { contract: token.contract } }"
        )
        // If you want to show website or operator:
        // tm-list-item(v-if="token.operator" dt="Operator" :dd="token.operator")
        // tm-list-item(v-if="token.token_website" dt="Website")
        //   template(slot="dd")
        //     a(:href="token.token_website" target="_blank") {{ token.token_website }}
  
      tm-part(title="Token Holdings" v-else-if="tokens.length === 1 && tokens[0].contract === 'None'")
        tm-list-item(dt="No tokens found")
  
      tm-part(title="Token Holdings" v-else-if="tokens.length === 0")
        tm-list-item(dt="Loading tokens...")
  
    // --------------------------------
    // Transactions
    // --------------------------------
    div
      tm-part(title="Transactions")
        table.BlocksTable
          thead
            tr
              th Time
              th Transaction Hash
              th Contract
              th Function
              th Fee (Stamps / XIAN)
          tbody
            tr(v-for="tx in transactions" :key="tx.hash")
              td {{ tx.formattedTime }}
              td
                router-link(:to="`/tx/${tx.hash}`")
                  | {{ shortenHash(tx.hash) }}
              td {{ shortenText(tx.contract) }}
              td {{ shortenText(tx.function) }}
              td
                | {{ (tx.stamps) }}
                span(style="opacity:.6")   /  
                  | {{ tx.feeXian }}
  
        tm-form-group.pagination
          a.button.prev(
            :class="{ disabled: page === 1 }"
            @click="prevPage"
          ) Prev
          span Page {{ page }}
          a.button.next(
            :class="{ disabled: transactions.length < itemsPerPage }"
            @click="nextPage"
          ) Next
  </template>
  
  <script>
  import { mapGetters } from "vuex";
  import axios from "axios";
  import {
    TmListItem,
    TmPage,
    TmPart,
    TmToolBar
  } from "@tendermint/ui";
  
  /**
   * Example helper if you used them before
   * (inline them or store in a separate utils file)
   */
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
    // Filter out weird or "no data" responses
    if (!decoded || decoded === "ée" || decoded === "AA==") {
      return "None";
    }
    decoded = JSON.parse(decoded);
    if (decoded.status === 1) {
      return "None";
    }
    return decoded.result.replaceAll("'", "");
  }
  
  export default {
    name: "page-address",
    components: {
      TmToolBar,
      TmListItem,
      TmPart,
      TmPage
    },
    data: () => ({
      wallet: { balance: 0 },
      tokens: [],        // Will hold all tokens with nonzero balances
      transactions: [],
      page: 1,
      itemsPerPage: 10,
      mainName: null,
      stampRate: null
    }),
    computed: {
      ...mapGetters(["blockchain"]), // must expose .rpc
  
      mainNameDisplay() {
        if (!this.mainName || this.mainName === "None") {
          return "—";
        }
        return this.mainName;
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
      shortenHash(hash) {
        return hash ? hash.substring(0, 12) + "..." + hash.slice(-4) : "N/A";
      },
      shortenText(text) {
        if (!text) return "";
        return text.length > 20 ? text.substring(0, 20) + "..." : text;
      },
  
      // Format token's display name, e.g. "USDC (USDC)"
      formattedTokenName(token) {
        var display = token.token_name || token.contract;
        if (token.token_symbol) {
          display += ` (${token.token_symbol})`;
        }
        return display;
      },
  
      // 1) Fetch the Name Service main name
      async fetchName() {
        const addr = this.$route.params.address;
        this.mainName = await execute_get_address_to_main_name(
          addr,
          this.blockchain.rpc
        );
      },
  
      // 2) Fetch the address’s XIAN balance
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
  
        // Safe checks
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
  
      // 3) Fetch transactions
      async fetchTransactions() {
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
  
          // Remove duplicates by hash
          for (let tx of newTxs) {
            if (!seenHashes.has(tx.hash)) {
              uniqueTransactions.push(tx);
              seenHashes.add(tx.hash);
            }
          }
  
          // If we got fewer than fetchBatchSize, no need to keep fetching
          if (newTxs.length < fetchBatchSize) {
            break;
          }
          currentOffset += fetchBatchSize;
        }
  
        // slice down to itemsPerPage and add a local time string
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
  
      // =======================================
      // 4) More Efficient Token Balances Method
      // =======================================
      async fetchAllTokenBalances() {
        // Step A) Fetch all user states > 0
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
  
        // Parse out "contract.balances:address" => contract
        const balances = {};
        for (let edge of edges) {
          if (!edge || !edge.node || !edge.node.key) continue;
          const fullKey = edge.node.key; // e.g. "con_usdc.balances:0xABC..."
          const [maybeContract, suffix] = fullKey.split(".balances:");
          if (suffix === userAddr) {
            const contractName = maybeContract.trim();
            const balanceValue = parseFloat(edge.node.value);
            if (contractName !== "currency" && balanceValue > 0) {
              balances[contractName] = balanceValue;
            }
          }
        }
  
        // If user has no nonzero balances in any contract, bail out
        const contractNames = Object.keys(balances);
        if (contractNames.length === 0) {
          this.tokens = [{ contract: "None", balance: "None" }];
          return;
        }
  
        // Step B) Check which of those contracts are xsc0001
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
  
        // Build a map of contractName -> xsc0001
        const contractMap = {};
        nodes.forEach(({ name, xsc0001 }) => {
          contractMap[name] = !!xsc0001;
        });
  
        // Filter out non-token contracts
        const realTokenContracts = Object.keys(balances).filter(
          (c) => contractMap[c] === true
        );
  
        // If no real tokens, show "None"
        if (realTokenContracts.length === 0) {
          this.tokens = [{ contract: "None", balance: "None" }];
          return;
        }
  
        // Step C) Fetch metadata (token_name, symbol, etc.)
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
  
        // Build a map => { [contractName]: { token_name, token_symbol, ... } }
        const metadataMap = {};
        for (let edge of edges) {
          if (!edge || !edge.node || !edge.node.key) continue;
          const fullKey = edge.node.key; // e.g. "con_usdc.metadata:token_name"
          const [contractDotMeta, field] = fullKey.split(":");
          const contractName = contractDotMeta.replace(".metadata", "");
          if (!metadataMap[contractName]) {
            metadataMap[contractName] = {};
          }
          metadataMap[contractName][field] = edge.node.value;
        }
  
        // Build final tokens array
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
  
        // Sort by name
        finalTokens.sort((a, b) => (a.token_name > b.token_name ? 1 : -1));
        this.tokens = finalTokens;
      }
    },
  
    // ========================================
    // Lifecycle Hooks
    // ========================================
    async mounted() {
      await this.fetchStampRate();
      await this.fetchName();
      await this.fetchAddress();
      await this.fetchTransactions();
      await this.fetchAllTokenBalances();
    }
  };
  </script>
  
  <style lang="stylus">
  .BlocksTable
    width 100%
    th
      color var(--dim)
      background var(--box-shadow)
      font-weight bold
      font-size 14px
    tr
      &:hover
        background-color var(--hover-bg)
    th, td
      padding 0.5rem 1rem
  </style>
  
  <style>
  pre {
    padding: 1rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    white-space: pre-wrap;
  }
  .pagination {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  a.button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  a.button {
    cursor: pointer;
  }
  </style>
  