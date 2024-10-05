<template lang="pug">
tm-page(:title="`Contract: ${contract.name}`")
  div(slot="menu"): tm-tool-bar
    a(:href="jsonUrl" target="_blank") JSON

  div(v-if="contract.code")
    tm-part(title='Contract Details')
      tm-list-item(dt="Name" :dd="contract['name']")

    tm-part(title='Code')
      pre {{ contract['code'] }} <!-- Display the code as plain text -->

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
    }
  }),
  computed: {
    ...mapGetters([
      "blockchain",
    ]),
    formattedCode() {
      // Format code for safe display
      return this.contract.code ? this.contract.code.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    }
  },
  methods: {
    async fetchContract(contract) {
      this.jsonUrl = `${this.blockchain.rpc}/abci_query?path=%22/contracts/${contract}%22`
      try {
        let json = await axios.get(this.jsonUrl);
        let decoded_resp = atob(json.data.result.response.value);
        this.contract.code = JSON.parse(decoded_resp)[0]["code"];
        this.contract.name = contract;
        if (this.contract.code === "ée") {
          this.contract.code = "";
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
      }
    },
  },
  async mounted() {
    await this.fetchContract(this.$route.params.contract);
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