<template lang="pug">
    tm-page(:title="`Address: ${this.$route.params.address}`")
      div(slot="menu"): tm-tool-bar
        
    
      div
        tm-part(title='Address Details')
          tm-list-item(dt="Address" :dd="this.$route.params.address")
          tm-list-item(dt="Balance" :dd="this.wallet.balance + ' XIAN'")
    
    
    </template>
    
    <script>
    import { mapGetters } from "vuex"
    import axios from "axios"
    import { TmListItem, TmPage, TmPart, TmToolBar } from "@tendermint/ui"
    
    export default {
      name: "page-address",
      components: {
        TmToolBar,
        TmListItem,
        TmPart,
        TmPage
      },
      data: () => ({
        jsonUrl: "",
        wallet: {
          balance: 0
        }
      }),
      computed: {
        ...mapGetters([
          "blockchain",
        ])
      },
      methods: {
        async fetchAddress(address) {
            const query = `
       query MyQuery($address: String!) {
  allStates(filter: {and: {key: {startsWith: $address, notLike: "%:%:%"}}}) {
    edges {
      node {
        value
      }
    }
  }
}
`;
address = "currency.balances:" + address;
            const response = await axios.post(`${this.blockchain.rpc}/graphql`, { query, variables: { address } });
            const balance = response.data.data.allStates.edges[0].node.value;
            this.wallet.balance = balance.toFixed(8);
        },
      },
      async mounted() {
        await this.fetchAddress(this.$route.params.address);
      },
    }
    </script>
    
    <style>
    pre {
      padding: 1rem;
        padding-top: .5rem;
        padding-bottom: .5rem;
        white-space: pre-wrap;
    }
    </style>