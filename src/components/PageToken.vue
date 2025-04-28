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
            a(:href="tokenData.token_website" target="_blank") {{ tokenData.token_website }}
        
        tm-list-item(v-if="tokenData.operator" dt="Operator")
          template(slot="dd")
            a(:href="`https://explorer.xian.org/addresses/${tokenData.operator}`")
              | {{ operatorDisplay }}  <!-- Display XNS if found -->

        tm-list-item(v-if="contract.name" dt="Contract Name")
          template(slot="dd")
            a(:href="`/contracts/${contract.name}`")
              | {{ contract.name }}

        tm-list-item(v-if="tokenData.total_supply" dt="Total Supply" :dd="tokenData.total_supply")

    div(v-if="contract.isToken")
      tm-part(title="Holders")
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
              td {{ h.balance }}
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

      operatorXnsName: "",
      holders: [],
  holdersPage: 1,
  holdersPerPage: 25,
  hasMoreHolders: false
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
    },
    
    async mounted() {
      await this.fetchContract(this.$route.params.token);

      if (this.contract.isToken) {
    this.fetchHolders();           // page 1
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
  </style>
  