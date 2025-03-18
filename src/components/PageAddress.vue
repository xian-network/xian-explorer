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
      tm-list-item(v-for="token in tokens" :key="token.contract" :dt="token.token_name" :dd="token.balance")
        
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
            th Stamps Used
        tbody
          tr(v-for="tx in transactions" :key="tx.hash")
            td {{ tx.formattedTime }}
            td
              router-link(:to="`/tx/${tx.hash}`")
                | {{ shortenHash(tx.hash) }}
            td {{ shortenText(tx.contract) }}
            td {{ shortenText(tx.function) }}
            td {{ tx.stamps }}

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

// --------------------------------------------------
// Example helper if you used them before
// (inline them or store in a separate utils file)
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
  if (!decoded || decoded === "ée" || decoded === "AA==") {
    return "None";
  }
  decoded = JSON.parse(decoded);
  if (decoded.status === 1) {
    return "None";
  }
  return decoded.result.replaceAll("'", "");
}
// --------------------------------------------------

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
    mainName: null
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
    shortenHash(hash) {
      return hash ? hash.substring(0, 12) + "..." + hash.slice(-4) : "N/A";
    },
    shortenText(text) {
      if (!text) return "";
      return text.length > 20 ? text.substring(0, 20) + "..." : text;
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

      // Safe checks w/o optional chaining
      const respData = response && response.data;
      const dataPart = respData && respData.data;
      const allStates = dataPart && dataPart.allStates;
      const edges = (allStates && allStates.edges) ? allStates.edges : [];

      let numericBalance = 0;
      if (edges[0] && edges[0].node && edges[0].node.value) {
        numericBalance = parseFloat(edges[0].node.value);
      }
      this.wallet.balance = numericBalance.toFixed(8);
    },

    async fetchTokenName(tokenContract) {
        // Construct the key dynamically using the actual token contract.
        const key = `${tokenContract}.metadata:token_name`;

        const query = `
          query TokenName($key: String!) {
            allStates(condition: { key: $key }) {
              nodes {
                value
              }
            }
          }
        `;

        const response = await axios.post(
          this.blockchain.rpc + "/graphql",
          { query , variables: { key } }
        );

        const nodes =
  response &&
  response.data &&
  response.data.data &&
  response.data.data.allStates &&
  response.data.data.allStates.nodes
    ? response.data.data.allStates.nodes
    : [];
        // Return the token name if found, otherwise fall back to the contract name.
        return nodes.length > 0 ? nodes[0].value : tokenContract;
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
      const finalTxs = uniqueTransactions.slice(0, this.itemsPerPage).map(tx => {
        return {
          ...tx,
          formattedTime: new Date(Number(tx.blockTime) / 1e6).toLocaleString()
        };
      });

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

    // 4) Fetch all token balances (XSC tokens)
    async fetchAllTokenBalances() {
      const userAddr = this.$route.params.address;
      let offset = 0;
      const batchSize = 50;
      const foundTokens = [];

      while (true) {
        // Fetch a page of XSC-standard tokens (xsc0001 = true)
        const query = `
          query FetchTokens($first: Int!, $offset: Int!) {
            allContracts(
              filter: { xsc0001: { equalTo: true } }
              first: $first
              offset: $offset
            ) {
              nodes {
                name
              }
            }
          }
        `;

        const resp = await axios.post(
          this.blockchain.rpc + "/graphql",
          {
            query,
            variables: { first: batchSize, offset }
          }
        );

        const respData = resp && resp.data;
        const dataPart = respData && respData.data;
        const allContracts = dataPart && dataPart.allContracts;
        const contractList = (allContracts && allContracts.nodes) ? allContracts.nodes : [];

        if (!contractList.length) {
          // No more tokens left
          break;
        }

        // For each token contract, fetch user’s balance
        for (let token of contractList) {
          const balanceKey = token.name + ".balances:" + userAddr;

          const balQuery = `
            query TokenBalance($balanceKey: String!) {
              allStates(filter: { key: { equalTo: $balanceKey } }) {
                edges {
                  node {
                    value
                  }
                }
              }
            }
          `;

          const balResp = await axios.post(
            this.blockchain.rpc + "/graphql",
            {
              query: balQuery,
              variables: { balanceKey }
            }
          );

          const balData = balResp && balResp.data;
          const balPart = balData && balData.data;
          const allStates = balPart && balPart.allStates;
          const edges = (allStates && allStates.edges) ? allStates.edges : [];

          let balanceVal = 0;
          if (edges[0] && edges[0].node && edges[0].node.value) {
            balanceVal = parseFloat(edges[0].node.value);
          }

          // Only keep tokens with nonzero balance
          if (balanceVal > 0 && token.name !== "currency") {
              const tokenName = await this.fetchTokenName(token.name);
              foundTokens.push({
                contract: token.name,
                balance: balanceVal,
                token_name: tokenName
              });

          }
        }

        offset += batchSize;
        // If fewer than batchSize, we’re done
        if (contractList.length < batchSize) {
          break;
        }
      }

      this.tokens = foundTokens;
      if (!this.tokens.length) {
        this.tokens = [{ contract: "None", balance: "None" }];
      }
    }
  },
  async mounted() {
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
