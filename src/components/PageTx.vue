<template lang="pug">
  tm-page(:title="`Transaction ${hash}`")
    div(slot="menu"): tm-tool-bar
      router-link(:to="`/blocks/${height}`")
        i.material-icons chevron_left
        | Block {{ height }}
      a(:href="jsonUrl" target="_blank") JSON
  
    div(v-if="decodedTx")
      tm-part(:title="`Transaction Details`")
        tm-list-item(:dt="'Hash'")
          template(slot="dd")
            dd(class="flex gap")
              span {{ decodedTx.txHash }}
              span(@click="copyToClipboard(decodedTx.txHash)" class="copy-icon")
                i.material-icons(:title="'Copy to clipboard'") content_copy
        tm-list-item(:dt="'Height'")
          template(slot="dd")
            router-link(:to="decodedTx.block.to" :title="decodedTx.block.title")
              | {{ decodedTx.block.text }}
        tm-list-item(:dt="'Timestamp'")
          template(slot="dd")
            | {{ formatDate(decodedTx.txTimestamp) }}
        tm-list-item(:dt="'Signature'")
          template(slot="dd")
            | {{ decodedTx.metadata.signature }}
        tm-list-item(:dt="'Sender'")
          template(slot="dd")
            router-link(:to="`/addresses/${decodedTx.payload.sender}`")
              | {{ senderDisplay }}
  
      tm-part(:title="`Transaction Result`")
        tm-list-item(:dt="'Success'")
          template(slot="dd")
            i.material-icons.success-icon(v-if="decodedTx.txResult.success" title="Success") check_circle
            i.material-icons.failed-icon(v-else title="Failed") cancel
        tm-list-item(:dt="'Fee (Stamps / XIAN)'")
          template(slot="dd")
            | {{ decodedTx.txResult.stampsUsed }}
            span(style="opacity:.6")   /  
              | {{ feeXian }}
        tm-list-item(:dt="'Result'")
          template(slot="dd")
            | {{ decodedTx.txResult.data.result }}

      tm-part(:title="`Transaction Request`")
        tm-list-item(:dt="'Contract'")
          template(slot="dd")
            router-link(:to="`/contracts/${decodedTx.payload.contract}`")
              | {{ decodedTx.payload.contract }}
        tm-list-item(:dt="'Function'")
          template(slot="dd")
            | {{ decodedTx.payload.function }}
        tm-list-item(:dt="'Arguments'")
          template(slot="dd")
            | {{ decodedTx.payload.kwargs }}
        tm-list-item(:dt="'Nonce'")
          template(slot="dd")
            | {{ decodedTx.payload.nonce }}
        tm-list-item(:dt="'Stamps Supplied'")
          template(slot="dd")
            | {{ decodedTx.payload.stamps_supplied }}

      details(:class="`tm-part-header`")
        summary(:class="`tm-part-title h5`") Rewards ({{ decodedTx.txResult.data.mergedRewards.length }})
        template(v-for="(reward, i) in decodedTx.txResult.data.mergedRewards")
          tm-list-item(:dt="`${reward.address}`")
            template(slot="dd")
              span.badge(:class="`badge-${reward.type}`") {{ reward.type }}
              span {{ reward.amount }}
              

      details(:class="`tm-part-header`")
        summary(:class="`tm-part-title h5`") Events ({{ decodedTx.txResult.data.events.length }})
        template(v-for="(event, i) in decodedTx.txResult.data.events")
          tm-list-item(:dt="`Event ${i}`")
            template(slot="dd")
              | {{ event }}

      details(:class="`tm-part-header`")
        summary(:class="`tm-part-title h5`") State Changes ({{ decodedTx.txResult.data.state.length }})
        template(v-for="(state, i) in decodedTx.txResult.data.state")
          tm-list-item(:dt="`State ${i}`")
            template(slot="dd")
              | {{ state }}

    tm-part(v-else title="Transaction was not found")
</template>

<style scoped>
.success-icon {
  color: green;
  font-size: 18px;
  vertical-align: middle;
}

.failed-icon {
  color: red;
  font-size: 18px;
  vertical-align: middle;
}

.copy-icon {
  cursor: pointer;
  margin-left: 5px;
}
.copy-icon:hover {
  opacity: 0.7;
}

/* Add spacing for collapsible sections */
details {
}
details summary {
  cursor: pointer;
  font-weight: bold;
}


.badge-foundation {
  background-color: #007bff;
  color: white;
  padding: 0 5px;
  border-radius: 5px;
  margin-right: 5px;
}
.badge-validator {
  background-color: #28a745;
  color: white;
  padding: 0 5px;
  border-radius: 5px;
  margin-right: 5px;
}
.badge-developer {
  background-color: #dc3545;
  color: white;
  margin-right: 5px;
  padding: 0 5px;
  border-radius: 5px;
}
</style>


  
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
      feeXian() {
   if (!this.decodedTx || !this.stampRate) return "—";
   return (this.decodedTx.txResult.stampsUsed / this.stampRate).toFixed(3);
 },
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

        // Merge all reward types into one array
        try {
  txResult.data.mergedRewards = txResult.rewards.foundation_reward
    .concat(txResult.rewards.validator_reward, txResult.rewards.developer_reward)
    .map(reward => ({
      address: reward.address || reward.validator || reward.developer,
      amount: Number(reward.amount),
      type: reward.developer ? 'developer' : (reward.validator ? 'validator' : 'foundation')
    }));
} catch (e) {
  console.error("Error merging rewards", e);
  txResult.data.mergedRewards = [];
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
        let obj = Object.assign({ txResult, block, txHash }, txObj);
        console.log(obj);
        return obj;
      },
      // If we got a name, use it; otherwise use the raw address
    // Show XNS name if found; else raw address
    senderDisplay() {
      // old-style fallback: no optional chaining
      if (this.senderName) {
        return this.senderName
      } else if (this.decodedTx && this.decodedTx.payload && this.decodedTx.payload.sender) {
        return this.decodedTx.payload.sender
      }
      return ""
    }
    },
    data: () => ({
      jsonUrl: "",
      tx: null,
      height: "",
      timestamp: "", // Make sure timestamp is part of data
      senderName: "",
      stampRate:null
    }),
    methods: {
      async fetchStampRate() {
   try {
     const r = await fetch(
       this.blockchain.rpc + '/abci_query?path="/get/stamp_cost.S:value"'
     );
     const v = (await r.json()).result.response.value;
     this.stampRate = v === "AA==" ? null : parseInt(atob(v), 10);
   } catch (e) {
     console.error("stamp‑rate fetch failed", e);
   }
 },
      formatDate(date) {
        return new Date(date).toLocaleString();
      },
      shortenHash(hash) {
        return hash ? `${hash.substring(0, 6)}...${hash.slice(-4)}` : "N/A";
      },
      copyToClipboard(text) {
  if (!text) return;

  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("Copied to clipboard: " + text);
      })
      .catch(err => {
        console.error("Clipboard copy failed", err);
        this.fallbackCopyTextToClipboard(text);
      });
  } else {
    this.fallbackCopyTextToClipboard(text);
  }
},

fallbackCopyTextToClipboard(text) {
  let tempInput = document.createElement("textarea");
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  alert("Copied to clipboard (fallback method): " + text);
},

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
        // Once we have `this.tx`, decode it and get the sender address:
        if (this.tx) {
        const txObj = decodeTx(this.tx)
        const addr = (txObj.payload && txObj.payload.sender) ? txObj.payload.sender : ""
        // Try resolve XNS
        this.senderName = await this.resolveXnsName(addr)
      }
      },
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
        const j = await resp.json()
        if (!j.result || !j.result.response || !j.result.response.value) return ""
        let decoded = JSON.parse(atob(j.result.response.value))
        if (decoded.status !== 1 && decoded.result && decoded.result !== "None") {
          return decoded.result.replace(/'/g, "")
        }
      } catch (err) {
        console.error("Name resolution error:", err)
      }
      return ""
    }
    },
    async mounted() {
      await this.fetchStampRate(); // Fetch the stamp rate
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
  
  