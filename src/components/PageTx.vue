<template lang="pug">
tm-page(:title="`Transaction ${hash}`")
  div(slot="menu"): tm-tool-bar
    router-link(:to="`/blocks/${height}`")
      i.material-icons chevron_left
      | Block {{ height }}
    a(:href="jsonUrl" target="_blank") JSON

  div(v-if="decodedTx")
    part-tx-data(
      :data="decodedTx"
      name="Transaction Details"
      pathPrefix="tx."
      :includeFields="[]"
      :excludeFields="[]"
    )

  tm-part(v-else title="Transaction was not found")
</template>

<script>
import { mapGetters } from "vuex"
import axios from "axios"
import { decodeTx, decodeData } from "../scripts/tx"
import PartTxData from './PartTxData'
import { TmListItem, TmPage, TmPart, TmToolBar } from "@tendermint/ui"

export default {
  name: "page-block",
  components: {
    TmToolBar,
    TmListItem,
    TmPart,
    TmPage,
    PartTxData
  },
  computed: {
    ...mapGetters(["blockchain"]),

    hash() {
      return this.$route.params.hash
    },
    prevHeight() {
      return this.block.header.height - 1
    },
    nextHeight() {
      return this.block.header.height + 1
    },
    decodedTx () {
      let { tx, height } = this
      if (!tx) return

      let txObj = decodeTx(tx)
      let txHash = this.hash
      let txResult = this.tx_result
      txResult.success = txResult.code === 0
      delete txResult.code
      delete txResult.log
      delete txResult.info
      delete txResult.gas_wanted
      txResult.stampsUsed = txResult.gas_used
      delete txResult.gas_used
      delete txResult.events
      delete txResult.codespace
      txResult.data = decodeData(txResult.data)
      delete txResult.data.stamps_used
      delete txResult.data.status
      delete txResult.data.hash
      // Move everything starting with txResult.data.state to the bottom in txResult
      let state = txResult.data.state
      delete txResult.data.state
      txResult.data.state = state
      delete txObj.payload
      delete txObj.metadata

      

      let block = {
        isRouterLink: true,
        title: "View block details",
        text: height,
        to: { name: "block", params: { block: height } }
      }
      return Object.assign({ txResult, block, txHash }, txObj)
    },
  },
  data: () => ({
    jsonUrl: "",
    // hash: this.$route.params.hash,
    tx: void 0,
    height: "",
  }),
  methods: {
    async fetchTx() {
      this.jsonUrl = `${this.blockchain.rpc}/tx?hash=0x${this.hash}`
      let json = await axios.get(this.jsonUrl)
      this.height = json.data.result.height
      this.tx = json.data.result.tx
      this.tx_result = json.data.result.tx_result
    },
  },
  async mounted() {
    await this.fetchTx()
  },
  watch: {
    // eslint-disable-next-line
    '$route'(to, from) {
      this.fetchTx()
    }
  }
}
</script>
