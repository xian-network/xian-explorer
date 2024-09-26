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
        return this.$route.params.hash;
      },
      prevHeight() {
        return this.block.header.height - 1;
      },
      nextHeight() {
        return this.block.header.height + 1;
      },
      decodedTx() {
        if (!this.tx || !this.timestamp) return null; // Wait for both tx and timestamp to be set
  
        let txObj = decodeTx(this.tx);
        let txHash = this.hash;
  
        // Add the timestamp to the transaction object
        let txTimestamp = this.timestamp;
        txObj = Object.assign({ txTimestamp }, txObj);
  
        let txResult = this.tx_result;
        txResult.success = txResult.code === 0;
  
        // Clean up txResult
        delete txResult.code;
        delete txResult.log;
        delete txResult.info;
        delete txResult.gas_wanted;
        delete txResult.gas_used;
        delete txResult.events;
        delete txResult.codespace;
  
        // Decode additional data
        txResult.data = decodeData(txResult.data);
        txResult.stampsUsed = txResult.data.stamps_used;
        txResult.rewards = {};
  
        if (!txResult.data.rewards) {
          txResult.data.rewards = {
            foundation_reward: {},
            masternode_reward: {},
            developer_reward: {}
          };
        } else {
          txResult.rewards.foundation_reward = Object.entries(txResult.data.rewards.foundation_reward).map(([k, v]) => ({ address: k, amount: v }));
          txResult.rewards.validator_reward = Object.entries(txResult.data.rewards.masternode_reward).map(([k, v]) => ({ validator: k, amount: v }));
          txResult.rewards.developer_reward = Object.entries(txResult.data.rewards.developer_reward).map(([k, v]) => ({ developer: k, amount: v }));
        }
  
        delete txResult.data.rewards;
        delete txResult.data.stamps_used;
        delete txResult.data.status;
        delete txResult.data.hash;
  
        let state = txResult.data.state;
        delete txResult.data.state;
        txResult.data.state = state;
  
        let block = {
          isRouterLink: true,
          title: "View block details",
          text: this.height,
          to: { name: "block", params: { block: this.height } }
        };
        return Object.assign({ txResult, block, txHash }, txObj);
      },
    },
    data: () => ({
      jsonUrl: "",
      tx: null,
      height: "",
      timestamp: "", // Make sure timestamp is part of data
    }),
    methods: {
      async fetchTx() {
        try {
          this.jsonUrl = `${this.blockchain.rpc}/tx?hash=0x${this.hash}`;
          let json = await axios.get(this.jsonUrl);
          this.height = json.data.result.height;
          this.tx = json.data.result.tx;
          this.tx_result = json.data.result.tx_result;
        } catch (error) {
          console.error("Error fetching transaction data:", error);
        }
      },
      async fetchBlockTimestamp() {
        try {
          if (this.height) {
            let json = await axios.get(`${this.blockchain.rpc}/block?height=${this.height}`);
            if (json.data && json.data.result) {
              this.timestamp = json.data.result.block.header.time || ""; // Assign the timestamp or empty string
            }
          }
        } catch (error) {
          console.error("Error fetching block timestamp:", error);
          this.timestamp = ""; // Reset timestamp on error
        }
      },
      async fetchTransactionData() {
        await this.fetchTx(); // First fetch the transaction data
        await this.fetchBlockTimestamp(); // Then fetch the block timestamp
      }
    },
    async mounted() {
      await this.fetchTransactionData(); // Fetch both transaction and timestamp
    },
    async beforeRouteUpdate(to, from, next) {
      await this.fetchTransactionData(); // Refetch both transaction and timestamp
      next(); // Call next to move to the new route
    },
    watch: {
      '$route'(to, from) {
        this.fetchTransactionData(); // Refetch both transaction and timestamp
      }
    }
  }
  </script>
  