<template lang="pug">
  tm-page(:title="`Address: ${$route.params.address}`")
    div(slot="menu"): tm-tool-bar

    div
      tm-part(title="Address Details")
        // Show a row for the name. If none is found, display "—".
        tm-list-item(dt="XNS Name" :dd="mainNameDisplay")
        tm-list-item(dt="Address" :dd="$route.params.address")
        tm-list-item(dt="Balance" :dd="wallet.balance + ' XIAN'")

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
                  | {{ tx.hash }}
              td {{ tx.contract }}
              td {{ tx.function }}
              td {{ tx.stamps }}

        tm-form-group.pagination
          a.button.prev(
            :class="{ disabled: page === 1 }"
            @click="prevPage"
          )
            | Prev
          span Page {{ page }}
          a.button.next(
            :class="{ disabled: transactions.length < itemsPerPage }"
            @click="nextPage"
          )
            | Next
</template>

<script>
import { mapGetters } from "vuex";
import axios from "axios";
import { TmListItem, TmPage, TmPart, TmToolBar } from "@tendermint/ui";

// -------------------------------------------------------------
// Helper: convert an array of bytes to a hex string
function toHexString(bytes) {
  return Array.from(bytes)
    .map((x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

// -------------------------------------------------------------
// Name Service lookup
// - Returns "None" if no registered name
// - Otherwise, returns the name (string)
async function execute_get_address_to_main_name(address, rpc) {
  const payload = {
    sender: "",
    contract: "con_name_service_final",
    function: "get_address_to_main_name",
    kwargs: { address }
  };

  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hex = toHexString(bytes);

  // Make sure you’re constructing the URL properly
  const response = await fetch(`${rpc}/abci_query?path="/simulate_tx/${hex}"`);
  const data = await response.json();

  let decoded = "";
  if (data.result.response.value) {
    decoded = atob(data.result.response.value);
  }

  // If empty or bizarre strings, treat as "None"
  if (!decoded || decoded === "ée" || decoded === "AA==") {
    return "None";
  }

  decoded = JSON.parse(decoded);
  if (decoded.status === 1) {
    return "None";
  }

  // Remove extra single quotes if present
  return decoded.result.replaceAll("'", "");
}
// -------------------------------------------------------------

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
    transactions: [],
    page: 1,
    itemsPerPage: 10,

    // We'll store the resolved Name Service result here
    mainName: null
  }),
  computed: {
    ...mapGetters([
      // Must at least have .rpc
      "blockchain"
    ]),

    // If there's a name, show it; otherwise "—"
    mainNameDisplay() {
      if (!this.mainName || this.mainName === "None") {
        return "—";
      }
      return this.mainName;
    }
  },
  methods: {
    // --------------------------------------------------------------------
    // 1) Fetch the Name Service "main name"
    async fetchName() {
      const addr = this.$route.params.address;
      this.mainName = await execute_get_address_to_main_name(addr, this.blockchain.rpc);
    },

    // --------------------------------------------------------------------
    // 2) Fetch the address’s balance
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
      const response = await axios.post(`${this.blockchain.rpc}/graphql`, {
        query,
        variables: { address: addressKey }
      });

      // Remove optional chaining
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

    // --------------------------------------------------------------------
    // 3) Fetch transactions
    async fetchTransactions() {
      const offset = (this.page - 1) * this.itemsPerPage;
      const fetchBatchSize = this.itemsPerPage * 2; // fetch more to handle duplicates
      let uniqueTransactions = [];
      let seenHashes = new Set();
      let currentOffset = offset;

      while (uniqueTransactions.length < this.itemsPerPage) {
        const query = `
          query MyQuery($address: String!, $offset: Int!, $batchSize: Int!) {
            allStateChanges(
              filter: {key: {includes: $address}}
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

        const response = await axios.post(`${this.blockchain.rpc}/graphql`, {
          query,
          variables
        });

        // Remove optional chaining
        const rData = response && response.data;
        const rDataPart = rData && rData.data;
        const allStateChanges = rDataPart && rDataPart.allStateChanges;
        const edges = (allStateChanges && allStateChanges.edges) ? allStateChanges.edges : [];

        const transactions = edges
          .map(edge => edge.node.transactionByTxHash)
          .filter(tx => tx && tx.hash);

        transactions.forEach(tx => {
          if (!seenHashes.has(tx.hash)) {
            uniqueTransactions.push(tx);
            seenHashes.add(tx.hash);
          }
        });

        // If fewer than fetchBatchSize came back, break
        if (transactions.length < fetchBatchSize) {
          break;
        }
        currentOffset += fetchBatchSize;
      }

      // Only keep the first `itemsPerPage` transactions
      this.transactions = uniqueTransactions.slice(0, this.itemsPerPage).map(tx => {
        return {
          ...tx,
          formattedTime: new Date(Number(tx.blockTime) / 1e6).toLocaleString()
        };
      });
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
    }
  },
  async mounted() {
    // Run sequentially or in parallel—here, sequentially for clarity
    await this.fetchName();
    await this.fetchAddress();
    await this.fetchTransactions();
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
