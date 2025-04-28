<template lang="pug">
  tm-page(:title="`Contract: ${contract.name}`")
    div(slot="menu"): tm-tool-bar
      a(:href="jsonUrl" target="_blank") JSON

    div(v-if="contract.isToken && Object.keys(tokenData).length")
      tm-part(title="Token Information")
       
        tm-list-item(v-if="contract.name" dt="Token Page")
          template(slot="dd")
            a(:href="`/tokens/${contract.name}`")
              | {{ tokenData.token_name + " (" + tokenData.token_symbol + ")" }}

    div(v-if="contract.code")
      tm-part(title='Contract Details')
        tm-list-item(dt="Name" :dd="contract['name']")
  
      tm-part(title='Code')
        pre {{ contract['code'] }}
  
    tm-part(v-else title="Contract not found")
  </template>
  
  <script>
  import { mapGetters } from "vuex"
  import axios from "axios"
  import { TmListItem, TmPage, TmPart, TmToolBar } from "@tendermint/ui"
  
  export default {
    name: "page-contract",
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

      operatorXnsName: ""
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
    }
    },
    async mounted() {
      await this.fetchContract(this.$route.params.contract);
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
  