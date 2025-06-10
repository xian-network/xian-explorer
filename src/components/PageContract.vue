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
        // 👉 highlighted Python source
        pre(class="hljs" v-html="highlightedCode")
  
    tm-part(v-else title="Contract not found")
</template>

<script>
import { mapGetters } from "vuex"
import axios from "axios"
// ── highlight.js setup ─────────────────────────────────────
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
hljs.registerLanguage('python', python)

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
    operatorXnsName: "",
    // 👉 here we keep the highlighted html
    highlightedCode: ""
  }),
  computed: {
    ...mapGetters(["blockchain"]),

    // If an XNS name was found, use it; else show the raw operator address
    operatorDisplay() {
      if (this.operatorXnsName) return this.operatorXnsName
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

      try {
        const res = await axios.post(`${this.blockchain.rpc}/graphql`, gqlQuery, {
          headers: { 'Content-Type': 'application/json' }
        })

        const contractData = res.data.data.contractByName || {}
        const stateData = res.data.data.allStates.edges || []

        this.contract.name = name
        this.contract.code = contractData.code || ""
        this.contract.isToken = contractData.xsc0001 === true

        // 👉 produce highlighted HTML once code is fetched
        this.highlightedCode = this.contract.code
          ? hljs.highlight('python', this.contract.code).value
          : ''

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
      } catch (err) {
        console.error("Error fetching contract/token data:", err)
        this.contract.code = ""
        this.contract.isToken = false
        this.tokenData = {}
        this.highlightedCode = ""
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
    await this.fetchContract(this.$route.params.contract)
  }
}
</script>

<style scoped>
@import url('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css');

pre {
  padding: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  white-space: pre-wrap;
  overflow-x: auto;
}
.hljs{
  background:none!important;
}
</style>