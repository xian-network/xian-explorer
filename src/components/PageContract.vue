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
            a(:href="`https://explorer.xian.org/addresses/${tokenData.operator}`") {{ tokenData.operator }}
        tm-list-item(v-if="tokenData.total_supply" dt="Total Supply" :dd="tokenData.total_supply")

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
      tokenData: {}
    }),
    computed: {
      ...mapGetters(["blockchain"])
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
  