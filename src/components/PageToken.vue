<template lang="pug">
  tm-page(:title="`Contract: ${contract.name}`")
    div(slot="menu"): tm-tool-bar
      a(:href="jsonUrl" target="_blank") JSON

    div(v-if="contract.isToken && Object.keys(tokenData).length")
      tm-part(title="Token Information")
        tm-list-item(v-if="tokenData.token_name" dt="Name" :dd="tokenData.token_name")
        tm-list-item(v-if="tokenData.token_symbol" dt="Symbol" :dd="tokenData.token_symbol")
        tm-list-item(v-if="tokenData.token_website" dt="Website")
          template(slot="dd")
            a(href="#" @click.prevent="visitWebsite(tokenData.token_website)") {{ tokenData.token_website }}

        
        tm-list-item(v-if="tokenData.operator" dt="Operator")
          template(slot="dd")
            a(:href="`https://explorer.xian.org/addresses/${tokenData.operator}`")
              | {{ operatorDisplay }}  <!-- Display XNS if found -->

        tm-list-item(v-if="contract.name" dt="Contract Name")
          template(slot="dd")
            a(:href="`/contracts/${contract.name}`")
              | {{ contract.name }}

        tm-list-item(v-if="tokenData.total_supply" dt="Total Supply" :dd="tokenData.total_supply")
        tm-list-item(v-if="tokenData.holder_count !== undefined" dt="Total Holders" :dd="tokenData.holder_count")

    div(v-if="contract.isToken")
      tm-part(title="Markets")
        table.BlocksTable
          thead
            tr
              th Pair
              th Price (Paired Token)
              th Change (24h)
          tbody
            tr(v-for="m in markets" :key="m.pair")
              td
                a(:href="`https://snakexchange.org/?token0=${m.token0}&token1=${m.token1}`" target="_blank") {{ m.label }}
                |  
                // ⁠Price chart (📈); `inverted` is true only when pair id === 1
                a.chart-link(
                  :href="`https://charts.xian.org/?pair=${m.pair}&tf=60&inverted=${m.pair === '1'}`"
                  style="float: right; margin-left: 0.5rem;"
                  target="_blank"
                ) Chart 📈
              td {{ m.price.toFixed(6) }} {{ tokenSymbols.get(m.pairedSymbol) || m.pairedSymbol }}
              td
                span(v-if="m.changePct > 0" class="green") +{{ m.changePct.toFixed(2) }}%
                span(v-else-if="m.changePct < 0" class="red") {{ m.changePct.toFixed(2) }}%
                span(v-else) 0.00%
            tr(v-if="markets.length === 0")
              td(colspan="3") No markets found

    div(v-if="contract.isToken")
      tm-part(title="Holders",:style="{ marginTop: '1rem' }")
        table.BlocksTable
          thead
            tr
              th Address / XNS
              th Balance
          tbody
            tr(v-if="holders.length === 0")
              td(colspan="2") Loading…
            tr(v-for="h in holders" :key="h.address")
              td
                router-link(:to="`/addresses/${h.address}`") {{ h.display }}
              td {{ parseFloat(h.balance).toFixed(8) }}
        tm-form-group.pagination
          a.button.prev(
            :class="{ disabled: holdersPage === 1 }"
            @click="prevHolders"
          ) Prev
          span Page {{ holdersPage }}
          a.button.next(
            :class="{ disabled: !hasMoreHolders }"
            @click="nextHolders"
          ) Next

  
    tm-part(v-else title="Token not found")


    div(v-if="showWebsiteModal" class="modal-overlay")
      div(class="modal-box")
        h2 Warning
        p You are about to visit an external website. This site may be unsafe. Proceed carefully.
        div(class="modal-buttons")
          button(@click="proceedWebsite" class="button confirm") Continue
          button(@click="cancelWebsite" class="button cancel") Cancel
  </template>
  
  <script>
  import { mapGetters } from "vuex"
  import axios from "axios"
  import { TmListItem, TmPage, TmPart, TmToolBar } from "@tendermint/ui"
  
  export default {
    name: "page-token",
    components: {
      TmToolBar,
      TmListItem,
      TmPart,
      TmPage
    },
    data: () => ({
      jsonUrl: "",
      contract: {
        name: "",
        code: "",
        isToken: false
      },
      tokenData: {},
      markets: [],
showWebsiteModal: false,
websiteToVisit: "",
      operatorXnsName: "",
      holders: [],
  holdersPage: 1,
  maxPairs: 1,
  holdersPerPage: 25,
  hasMoreHolders: false,
  tokens: new Map(), // Assuming you have a map of tokens
  pairMap: new Map(),
  tokenSymbols: new Map(), // Assuming you have a map of token symbols
    }),
    computed: {
      ...mapGetters(["blockchain"]),

       // If an XNS name was found, use it; else show the raw operator address
    operatorDisplay() {
      if (this.operatorXnsName) {
        return this.operatorXnsName
      }
      return this.tokenData.operator || ""
    }
    },
    methods: {
      visitWebsite(url) {
        // Fix the URL if it doesn't start with http(s)
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }
  if (!url) return;
  this.websiteToVisit = url;
  this.showWebsiteModal = true;
},
proceedWebsite() {
  if (this.websiteToVisit) {
    window.open(this.websiteToVisit, '_blank');
  }
  this.showWebsiteModal = false;
  this.websiteToVisit = "";
},
cancelWebsite() {
  this.showWebsiteModal = false;
  this.websiteToVisit = "";
},
      /* ─ Count addresses whose balance > 0 ─ */
async fetchHoldersCount () {
  if (!this.contract.name) return;

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
        totalCount      # <-- just the number
      }
    }`;
  const variables = { prefix: `${this.contract.name}.balances:` };

  try {
    const { data } = await axios.post(
      `${this.blockchain.rpc}/graphql`,
      { query, variables }
    );
    let count = 0;
if (
  data &&
  data.data &&
  data.data.allStates &&
  typeof data.data.allStates.totalCount !== "undefined"
) {
  count = data.data.allStates.totalCount;
}
this.tokenData.holder_count = count;
  } catch (e) {
    console.error("holder-count error", e);
    this.tokenData.holder_count = 0;
  }
},

      async fetchContract(name) {
        const tokenKeys = [
          `${name}.metadata:token_name`,
          `${name}.metadata:token_symbol`,
          `${name}.metadata:token_website`,
          `${name}.metadata:operator`,
          `${name}.metadata:total_supply`
        ];

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
        };

        try {
          const res = await axios.post(`${this.blockchain.rpc}/graphql`, gqlQuery, {
            headers: { 'Content-Type': 'application/json' }
          });

          const contractData = res.data.data.contractByName || {};
          const stateData = res.data.data.allStates.edges || [];

          this.contract.name = name;
          this.contract.code = contractData.code || "";
          this.contract.isToken = contractData.xsc0001 === true;

          this.tokenData = {};
          stateData.forEach(({ node }) => {
            const key = node.key.split(":")[1]; // get `token_name` etc.
            this.tokenData[key] = node.value;
          });

          this.jsonUrl = `${this.blockchain.rpc}/graphql?query=${encodeURIComponent(gqlQuery.query)}`;
        } catch (err) {
          console.error("Error fetching contract/token data:", err);
          this.contract.code = "";
          this.contract.isToken = false;
          this.tokenData = {};
        }

        try {
        const res = await axios.post(`${this.blockchain.rpc}/graphql`, gqlQuery, {
          headers: { 'Content-Type': 'application/json' }
        })

        const contractData = res.data.data.contractByName || {}
        const stateData = res.data.data.allStates.edges || []

        // Basic contract details
        this.contract.name = name
        this.contract.code = contractData.code || ""
        this.contract.isToken = contractData.xsc0001 === true

        // Build token data from states
        this.tokenData = {}
        stateData.forEach(({ node }) => {
          const key = node.key.split(":")[1] // e.g. "operator"
          this.tokenData[key] = node.value
        })

        // If there's an operator, resolve XNS name
        if (this.tokenData.operator) {
          this.operatorXnsName = await this.resolveXnsName(this.tokenData.operator)
        }

        this.jsonUrl = `${this.blockchain.rpc}/graphql?query=${encodeURIComponent(gqlQuery.query)}`

      } catch (err) {
        console.error("Error fetching contract/token data:", err)
        this.contract.code = ""
        this.contract.isToken = false
        this.tokenData = {}
      }
      },
      // Same XNS resolution approach as before
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
    async fetchHolders(page = 1) {
    if (!this.contract.name) return;
    this.holdersPage = page;

    const first = this.holdersPerPage + 1;   // fetch one extra to know “next”
    const offset = (page - 1) * this.holdersPerPage;

    const query = `
      query TokenHolders($keyPrefix:String!, $first:Int!, $offset:Int!){
        allStates(
          filter:{
            and:{
              key:{ startsWith:$keyPrefix, notLike: "%:%:%" }
              valueNumeric:{ greaterThan:"0" }
            }
            
          }
          orderBy: VALUE_NUMERIC_DESC
          first:$first
          offset:$offset
        ){
          edges{ node{ key value } }
        }
      }`;

    const variables = {
      keyPrefix: `${this.contract.name}.balances:`,
      first,
      offset
    };

    try {
      const { data } = await axios.post(
        `${this.blockchain.rpc}/graphql`,
        { query, variables }
      );
      const edges = data.data.allStates.edges || [];

      /* slice to page size & map */
      const slice = edges.slice(0, this.holdersPerPage);
      this.hasMoreHolders = edges.length > this.holdersPerPage;

      this.holders = await Promise.all(
        slice.map(async ({ node }) => {
          const address = node.key.split(":")[1];
          const xns     = await this.resolveXnsName(address); // reuse helper
          return {
            address,
            display: xns || address,
            balance: node.value
          };
        })
      );
    } catch (e) {
      console.error("holder list error", e);
      this.holders = [];
      this.hasMoreHolders = false;
    }
  },

  nextHolders() {
    if (this.hasMoreHolders) this.fetchHolders(this.holdersPage + 1);
  },
  prevHolders() {
    if (this.holdersPage > 1) this.fetchHolders(this.holdersPage - 1);
  },
  async fetchMarkets() {
      try {
        const query = {
          query: `query { allEvents(condition:{contract:"con_pairs",event:"PairCreated"}) { edges { node { dataIndexed data } } } }`
        }
        const res = await axios.post(`${this.blockchain.rpc}/graphql`, query)
        const edges = res && res.data && res.data.data && res.data.data.allEvents && res.data.data.allEvents.edges || []

        const pairs = edges.map(e => ({
          pair: e.node && e.node.data && e.node.data.pair || null,
          token0: e.node && e.node.dataIndexed && e.node.dataIndexed.token0,
          token1: e.node && e.node.dataIndexed && e.node.dataIndexed.token1
        })).filter(p => p.pair)

        // Limit to maxPairs if set
        if (this.maxPairs > 0 && this.contract.name == "currency") {
          pairs.sort((a, b) => a.pair.localeCompare(b.pair))
          pairs.splice(this.maxPairs)
        }

        const related = pairs.filter(p => p.token0 === this.contract.name || p.token1 === this.contract.name)
        const uniqueTokens = new Set(related.map(p => (p.token0 === this.contract.name ? p.token1 : p.token0)))

        await this.fetchTokenSymbols([...uniqueTokens])

        const result = []
        for (const p of related) {
          const baseIsToken0 = p.token0 === this.contract.name
          let price = await this.getLatestPrice(p.pair, baseIsToken0)
          if (price === 0) {
            const inversePrice = await this.getLatestPrice(p.pair, !baseIsToken0)
            if (inversePrice > 0) price = 1 / inversePrice
          }
          if (price === 0) continue
          let price24h = await this.getHistoricalPrice(p.pair, baseIsToken0);
          if (price24h === 0){
            const inversePrice24h = await this.getHistoricalPrice(p.pair, !baseIsToken0);
            if (inversePrice24h > 0) price24h = 1 / inversePrice24h;
          }
          const changePct = ((price - price24h) / price24h) * 100

          const paired = baseIsToken0 ? p.token1 : p.token0
          result.push({
            pair: p.pair,
            token0: p.token0,
            token1: p.token1,
            label: `${p.token0} / ${p.token1}`,
            price,
            pairedSymbol: paired,
  changePct
          })
        }

        this.markets = result
      } catch (err) {
        console.error("Market fetch error", err)
        this.markets = []
      }
    },
    async fetchTokenSymbols(contracts) {
      if (!contracts.length) return
      const keys = contracts.map(c => `"${c}.metadata:token_symbol"`).join(",")
      const query = {
        query: `query { allStates(filter:{key:{in:[${keys}]}}) { edges { node { key value } } } }`
      }
      try {
        const res = await axios.post(`${this.blockchain.rpc}/graphql`, query)
        const edges = res && res.data && res.data.data && res.data.data.allStates && res.data.data.allStates.edges || []
        edges.forEach(({ node }) => {
          const contract = node.key.split(".")[0]
          this.tokenSymbols.set(contract, node.value)
        })
      } catch (e) {
        console.error("Failed to fetch token symbols", e)
      }
    },
    async getLatestPrice(pair, baseIsToken0) {
      try {
        const query = {
          query: `query { allEvents(condition: {contract:"con_pairs", event:"Swap"}, filter: {dataIndexed:{contains:{pair:"${pair}"}}}, orderBy: CREATED_DESC, first: 1) { edges { node { data } } } }`
        }
        const res = await axios.post(`${this.blockchain.rpc}/graphql`, query)
        const data = res && res.data && res.data.data && res.data.data.allEvents && res.data.data.allEvents.edges && res.data.data.allEvents.edges[0] && res.data.data.allEvents.edges[0].node && res.data.data.allEvents.edges[0].node.data || {}

        const a0in = parseFloat(data.amount0In || 0)
        const a1in = parseFloat(data.amount1In || 0)
        const a0out = parseFloat(data.amount0Out || 0)
        const a1out = parseFloat(data.amount1Out || 0)

        if (baseIsToken0 && a0in > 0 && a1out > 0) return a1out / a0in
        if (!baseIsToken0 && a1in > 0 && a0out > 0) return a0out / a1in

        return 0
      } catch (e) {
        console.error("Price fetch failed for", pair, e)
        return 0
      }
    },
    async getHistoricalPrice(pair, baseIsToken0) {
  try {
    const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const formatted = yesterday.toISOString().replace("Z", ""); // remove trailing 'Z'
    const query = {
      query: `query {
        allEvents(
          condition: {contract:"con_pairs", event:"Swap"},
          filter: {
            dataIndexed: {contains: {pair: "${pair}"}},
            created: {lessThan: "${formatted}"}
          },
          orderBy: CREATED_DESC,
          first: 1
        ) {
          edges { node { data } }
        }
      }`
    };
    const res = await axios.post(`${this.blockchain.rpc}/graphql`, query);
    
    const data = res && res.data && res.data.data && res.data.data.allEvents && res.data.data.allEvents.edges && res.data.data.allEvents.edges[0] && res.data.data.allEvents.edges[0].node && res.data.data.allEvents.edges[0].node.data || {};

    const a0in = parseFloat(data.amount0In || 0);
    const a1in = parseFloat(data.amount1In || 0);
    const a0out = parseFloat(data.amount0Out || 0);
    const a1out = parseFloat(data.amount1Out || 0);

    if (baseIsToken0 && a0in > 0 && a1out > 0) return a1out / a0in;
    if (!baseIsToken0 && a1in > 0 && a0out > 0) return a0out / a1in;

    return 0;
  } catch (e) {
    console.error("24h historical price fetch failed for", pair, e);
    return 0;
  }
}

    },
    
    async mounted() {
      await this.fetchContract(this.$route.params.token);

      if (this.contract.isToken) {
        this.fetchHoldersCount();   // <-- new
    this.fetchHolders();           // page 1
    this.fetchMarkets();
  }
    }
  }
  </script>
  
  <style scoped>
  pre {
    padding: 1rem;
    padding-top: .5rem;
    padding-bottom: .5rem;
    white-space: pre-wrap;
  }
  .modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #1a1a1a;
  padding: 20px;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  color: #fff;
}

.modal-buttons {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.button {
  padding: 8px 16px;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

.button.confirm {
  background-color: #4caf50;
  color: white;
}

.button.cancel {
  background-color: #f44336;
  color: white;
}

.BlocksTable {
  table-layout: fixed;
  width: 100%;
  border-collapse: collapse;
}

.BlocksTable th,
.BlocksTable td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.BlocksTable thead th:nth-child(1) {
  width: 40%;
}

.BlocksTable thead th:nth-child(2),
.BlocksTable thead th:nth-child(3) {
  width: 30%
}
.pagination {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }

  .green {
    color: #4caf50;
  }
  .red {
    color: #f44336;
  }
  </style>
  