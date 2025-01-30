<template lang="pug">
tm-page(title='Overview')
  tm-part(title='Blockchain')
    tm-list-item(dt='Chain ID' :dd='latestBlock.chain_id')
    tm-list-item(dt='Stamp Rate (Stamps/Xian)' :dd='stampRate || ""')
    tm-list-item(dt='Total Transactions' :dd='num.prettyInt(totalTxs || 0)')
    tm-list-item(dt='Xian Holders' :dd='num.prettyInt(totalHolders || 0)')
    //tm-list-item(dt='Circulating Supply' :dd='num.pretty(circulatingSupply || 0) + " XIAN"')

  tm-part(title='Current Block' v-if="latestBlock.height > 0")
    tm-list-item(dt='Block Height' :dd='num.prettyInt(latestBlock.height)'
      :to="{ name: 'block', params: { block: latestBlock.height }}")
    tm-list-item(dt='Block Time' :dd='readableDate(latestBlock.time)')
    tm-list-item(dt='Transactions' :dd='num.prettyInt(latestBlock.num_txs)')
    tm-list-item(dt='Last Commit Hash' :dd='latestBlock.last_commit_hash')

  tm-part(title='Current Block' v-else)
    tm-list-item(dt='Block Height' :dd='num.prettyInt(latestBlock.height)'
      :to="{ name: 'block', params: { block: latestBlock.height }}")
    tm-list-item(dt='Block Time' dd='No blocks yet')
    tm-list-item(dt='Last Commit Hash' dd='N/A')

  tm-part(title='Connected To')
    tm-list-item(dt='RPC Endpoint')
      div(slot="dd").node-wrapper
        tm-field.node-input(
          type="text"
          v-model="bc.rpc")

</template>

<script>
import axios from "axios";
import num from "../scripts/num"
import { mapGetters } from "vuex"
import { readableDate } from "../scripts/utils"
import votingValidators from "../scripts/votingValidators"
import { TmListItem, TmPage, TmPart, TmField } from "@tendermint/ui"

export default {
  name: "page-index",
  components: {
    TmListItem,
    TmPage,
    TmPart,
    TmField
  },
  computed: {
    ...mapGetters([
      "bc",
      "config",
      "nodes",
      "validators",
      "consensusState",
      "blocks",
      "latestBlock",
      
    ]),
    validatorsActive() {
      if (this.validators && this.validators.length > 0) {
        return this.validatorCount
      }
      if (this.consensusState && this.consensusState.height_vote_set) {
        return "STALLED"
      }
      return "Loading..."
    },
    validatorCount() {
      return `${votingValidators(this.validators).length} voting / ${
        this.validators.length
      } total`
    },
    prevotes() {
      if (this.consensusState && this.consensusState.height_vote_set) {
        let prevotes = this.consensusState.height_vote_set[0].prevotes_bit_array
        let split = prevotes.split(" ")
        let onlineSteak = split[1].split("/")[0]
        let totalSteak = split[1].split("/")[1]
        let minimumSteak = Math.round(totalSteak * 0.6667)
        if (onlineSteak >= minimumSteak) {
          return `${split[3] * 100}% prevoted`
        } else {
          return `${split[3] *
            100}% prevoted (${onlineSteak}steak, need ${minimumSteak}steak)`
        }
      }
      return "Loading..."
    },
    precommits() {
      if (this.consensusState && this.consensusState.height_vote_set) {
        let precommits = this.consensusState.height_vote_set[0]
          .precommits_bit_array
        let split = precommits.split(" ")
        let onlineSteak = split[1].split("/")[0]
        let totalSteak = split[1].split("/")[1]
        let minimumSteak = Math.round(totalSteak * 0.6667)
        if (onlineSteak >= minimumSteak) {
          return `${Math.round(split[3] * 100)}% precommitted`
        } else {
          return `${Math.round(
            split[3] * 100
          )}% precommitted (${onlineSteak}steak, need ${minimumSteak}steak)`
        }
      }
      return "Loading..."
    }
  },
  data: () => ({
    num: num,
    stampRate: null,
    totalTxs: 0,
    totalHolders: 0,
    circulatingSupply: 0
  }),
  mounted() {
    this.setMetaDescription('Xian Explorer is a blockchain explorer for the Xian blockchain. It allows you to explore the blockchain, view the latest blocks and transactions, and see the current validators.')
    this.fetchStampRate();
    this.fetchTotalTxs();
    this.fetchTotalHolders();
    this.fetchCirculatingSupply();
  },
  methods: {
    readableDate,
    toggleBlockchainSelect() {
      this.$store.commit(
        "SET_CONFIG_BLOCKCHAIN_SELECT",
        !this.config.blockchainSelect
      )
    },
    setMetaDescription(description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    },
    async fetchStampRate() {
    try {
      const response = await fetch(this.bc.rpc + '/abci_query?path="/get/stamp_cost.S:value"');
      const data = await response.json();
      if (data.result.response.value === "AA==") {
        this.stampRate = null;
      } else {
        this.stampRate = parseInt(atob(data.result.response.value), 10);
      }
    } catch (error) {
      console.error("Error fetching stamp rate:", error);
      this.stampRate = "Error";
    }
  },
  async fetchTotalHolders() {
    try {
      const query = `
       query RichList {
  allStates(
    filter: {and: {key: {startsWith: "currency.balances:", notLike: "%:%:%"}}}
    orderBy: VALUE_DESC
  ) {
    
    totalCount
  }
}

`;


      const response = await axios.post(`${this.bc.rpc}/graphql`, {
        query
      });
      const data = response.data;
      if (data && data.data && data.data.allStates && data.data.allStates.totalCount) {
        this.totalHolders = parseInt(data.data.allStates.totalCount, 10);
      } else {
        console.error("Error fetching total holders: Invalid response format");
        this.totalHolders = "Error";
      }
    } catch (error) {
        console.error("Error fetching total holders:", error);
        this.totalHolders = "Error";
    }
  },
  async fetchTotalTxs() {
    try {
        const response = await fetch(`${this.bc.rpc}/tx_search?query="tx.height>0"&per_page=1&page=1`);
        const data = await response.json();
        if (data && data.result && data.result.total_count) {
            this.totalTxs = parseInt(data.result.total_count, 10);
        } else {
            console.error("Error fetching total transactions: Invalid response format");
            this.totalTxs = "Error";
        }
    } catch (error) {
        console.error("Error fetching total transactions:", error);
        this.totalTxs = "Error";
    }
  },
  async fetchCirculatingSupply() {
    this.circulatingSupply = 0;

    let totalSupply = 111111111;
    // Excluded from total supply to get circulating supply is the following:
    // Balance of team_lock
    // Balance of dao_funding_stream
    // Balance of dao 
    // Balance of team_vesting
    // Balance of masternodes

    try{
      const query = `
       query Balances {
  allStates(
    filter: {and: {key: {startsWith: "currency.balances:", notLike: "%:%:%", in: ["currency.balances:team_lock", "currency.balances:dao_funding_stream", "currency.balances:dao", "currency.balances:team_vesting", "currency.balances:masternodes"
    ]}}}
    orderBy: VALUE_DESC
  ) { 
    nodes {
      value
    }
  }
}
`
      const response = await axios.post(`${this.bc.rpc}/graphql`, {
        query
      });
      const data = response.data;
      if (data && data.data && data.data.allStates && data.data.allStates.nodes) {
        data.data.allStates.nodes.forEach(node => {
          this.circulatingSupply += parseFloat(node.value);
        });
        this.circulatingSupply = totalSupply - this.circulatingSupply;
      } else {
        console.error("Error fetching circulating supply: Invalid response format");
        this.circulatingSupply = "Error";
      }
    } catch (error) {
      console.error("Error fetching team_lock balance:", error);
    }
  },
}
}
</script>

<style lang='stylus'>
@require '~variables'

.tm-field.node-input
  min-width 20rem
  height 2rem
  padding 0 0.5rem
  background transparent
  df()

.node-wrapper{
  display: flex;
  align-items: center;
}
</style>
