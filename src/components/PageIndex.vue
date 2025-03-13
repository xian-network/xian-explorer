<template lang="pug">
  tm-page(title='Overview')
    // -- Search Section (more attractive) --
    .search-container
      tm-part(title='Global Search')
        p.search-subtitle
          | Enter a Name, Block Height, Transaction Hash, Contract, or Address
        tm-form-struct(@submit.native.prevent="onSubmit")
          
          .search-bar
            tm-field#search-input(
              type="text"
              placeholder="e.g. 2e7fdde43ed6.., 12345, or alice"
              :autofocus="true"
              required
              v-model="query"
            )
            tm-btn(type="submit" icon="search" :disabled="loading" value="Go")
  
    // --- Existing "Blockchain" Part ---
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
  import num from "../scripts/num";
  import { mapGetters } from "vuex";
  import { readableDate } from "../scripts/utils";
  import votingValidators from "../scripts/votingValidators";
  
  // Import the extra components needed for the search form:
  import {
    TmListItem,
    TmPage,
    TmPart,
    TmField,
    TmBtn,
    TmFormStruct,
    TmFormGroup
  } from "@tendermint/ui";
  
  export default {
    name: "page-index",
    components: {
      TmListItem,
      TmPage,
      TmPart,
      TmField,
      TmBtn,
      TmFormStruct,
      TmFormGroup
    },
    computed: {
      ...mapGetters([
        "bc",            // needed for search requests
        "config",
        "nodes",
        "validators",
        "consensusState",
        "blocks",
        "latestBlock"
      ]),
      validatorsActive() {
        if (this.validators && this.validators.length > 0) {
          return this.validatorCount;
        }
        if (this.consensusState && this.consensusState.height_vote_set) {
          return "STALLED";
        }
        return "Loading...";
      },
      validatorCount() {
        return `${votingValidators(this.validators).length} voting / ${
          this.validators.length
        } total`;
      },
      prevotes() {
        if (this.consensusState && this.consensusState.height_vote_set) {
          let prevotes = this.consensusState.height_vote_set[0].prevotes_bit_array;
          let split = prevotes.split(" ");
          let onlineSteak = split[1].split("/")[0];
          let totalSteak = split[1].split("/")[1];
          let minimumSteak = Math.round(totalSteak * 0.6667);
          if (onlineSteak >= minimumSteak) {
            return `${split[3] * 100}% prevoted`;
          } else {
            return `${split[3] * 100}% prevoted (${onlineSteak}steak, need ${minimumSteak}steak)`;
          }
        }
        return "Loading...";
      },
      precommits() {
        if (this.consensusState && this.consensusState.height_vote_set) {
          let precommits = this.consensusState.height_vote_set[0].precommits_bit_array;
          let split = precommits.split(" ");
          let onlineSteak = split[1].split("/")[0];
          let totalSteak = split[1].split("/")[1];
          let minimumSteak = Math.round(totalSteak * 0.6667);
          if (onlineSteak >= minimumSteak) {
            return `${Math.round(split[3] * 100)}% precommitted`;
          } else {
            return `${Math.round(
              split[3] * 100
            )}% precommitted (${onlineSteak}steak, need ${minimumSteak}steak)`;
          }
        }
        return "Loading...";
      }
    },
    data: () => ({
      // For the search
      query: "",
      loading: false,
  
      // Existing data
      num: num,
      stampRate: null,
      totalTxs: 0,
      totalHolders: 0,
      circulatingSupply: 0
    }),
    mounted() {
      // Existing calls
      this.setMetaDescription(
        "Xian Explorer is a blockchain explorer for the Xian blockchain..."
      );
      this.fetchStampRate();
      this.fetchTotalTxs();
      this.fetchTotalHolders();
      this.fetchCirculatingSupply();
    },
    methods: {
      readableDate,
  
      // Existing methods
      toggleBlockchainSelect() {
        this.$store.commit(
          "SET_CONFIG_BLOCKCHAIN_SELECT",
          !this.config.blockchainSelect
        );
      },
      setMetaDescription(description) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement("meta");
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
                filter: {
                  and: {
                    key: {
                      startsWith: "currency.balances:", 
                      notLike: "%:%:%"
                    }
                  }
                }
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
          if (
            data &&
            data.data &&
            data.data.allStates &&
            data.data.allStates.totalCount
          ) {
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
          const response = await fetch(
            `${this.bc.rpc}/tx_search?query="tx.height>0"&per_page=1&page=1`
          );
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
        //   team_lock
        //   dao_funding_stream
        //   dao
        //   team_vesting
        //   masternodes
        try {
          const query = `
            query Balances {
              allStates(
                filter: {
                  and: {
                    key: {
                      startsWith: "currency.balances:",
                      notLike: "%:%:%",
                      in: [
                        "currency.balances:team_lock", 
                        "currency.balances:dao_funding_stream", 
                        "currency.balances:dao", 
                        "currency.balances:team_vesting", 
                        "currency.balances:masternodes"
                      ]
                    }
                  }
                }
                orderBy: VALUE_DESC
              ) { 
                nodes {
                  value
                }
              }
            }
          `;
          const response = await axios.post(`${this.bc.rpc}/graphql`, {
            query
          });
          const data = response.data;
          if (
            data &&
            data.data &&
            data.data.allStates &&
            data.data.allStates.nodes
          ) {
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
  
      // --- BEGIN: Methods from the search page ---
      async onSubmit(event) {
        if (event) event.preventDefault();
        this.loading = true;
        await this.search();
        this.loading = false;
      },
      async search() {
        if (!this.query) return;
        const trimmedQuery = this.query.trim();
  
        try {
          // Try resolving as an XNS name first
          const address = await this.resolveXnsName(trimmedQuery);
          if (address && address !== "None") {
            this.$router.push({ name: "address", params: { address } });
            return;
          }
  
          // If it's a 64 hex string, assume it's either a tx or address
          if (/^[a-fA-F0-9]{64}$/.test(trimmedQuery)) {
            const txExists = await this.checkTxExists(trimmedQuery);
            if (txExists) {
              this.$router.push({ name: "tx", params: { hash: trimmedQuery } });
              return;
            }
            this.$router.push({ name: "address", params: { address: trimmedQuery } });
          }
          // If it’s numeric, treat as block
          else if (/^\d+$/.test(trimmedQuery)) {
            this.$router.push({ name: "block", params: { block: trimmedQuery } });
          } else {
            // Otherwise, see if it’s a contract
            const contractExists = await this.checkContractExists(trimmedQuery);
            if (contractExists) {
              this.$router.push({ name: "contract", params: { contract: trimmedQuery } });
            } else {
              alert("No matching transaction, address, or contract found.");
            }
          }
        } catch (error) {
          console.error("Search error:", error);
        }
      },
      async resolveXnsName(name) {
        try {
          const payload = {
            sender: "",
            contract: "con_name_service_final",
            function: "get_main_name_to_address",
            kwargs: { name },
          };
  
          const bytes = new TextEncoder().encode(JSON.stringify(payload));
          const hex = Array.from(bytes)
            .map(x => ("00" + x.toString(16)).slice(-2))
            .join("");
          const response = await fetch(`${this.bc.rpc}/abci_query?path="/simulate_tx/${hex}"`);
          const data = await response.json();
  
          if (!data.result || !data.result.response || !data.result.response.value) {
            return null;
          }
  
          let decoded = atob(data.result.response.value);
          const parsed = JSON.parse(decoded);
          return parsed.status !== 1 && parsed.result && parsed.result.replace(/'/g, "") !== "None"
            ? parsed.result.replace(/'/g, "")
            : null;
        } catch (err) {
          console.error("XNS resolution error:", err);
          return null;
        }
      },
      async checkTxExists(txHash) {
        try {
          const response = await fetch(`${this.bc.rpc}/tx?hash=0x${txHash}`);
          const data = await response.json();
          return data.result && data.result.tx_result;
        } catch (err) {
          console.error("Transaction lookup error:", err);
          return false;
        }
      },
      async checkContractExists(contractName) {
        try {
          const response = await fetch(`${this.bc.rpc}/abci_query?path="/contract/${contractName}"`);
          const data = await response.json();
          return data.result && data.result.response && data.result.response.value != null;
        } catch (err) {
          console.error("Contract lookup error:", err);
          return false;
        }
      }
      // --- END: Methods from the search page ---
    }
  };
  </script>
  
  <style lang='stylus'>
  @require '~variables'

  // Container for the search area
  .search-container
    border-radius 8px
    box-shadow 0 1px 3px rgba(0,0,0,.1)

  // Optional subtitle under the part title
  .search-subtitle
    padding-left 1rem
    padding-right 1rem
    padding-top 0.5rem
    padding-bottom 1rem
    color white

  // The search bar row
  .search-bar
    display flex
    flex-direction row
    align-items center
    border-radius 4px
    padding-left 1rem
    padding-right 0.5rem
    padding-bottom 1rem

    .tm-field
      flex 1
      margin-right 0.5rem

    .tm-field input
      border none
      outline none
      width 100%
      background transparent
      font-size 1rem

    .tm-btn
      flex-shrink 0
      margin-left 0.5rem

  .loading-spinner
    margin-left 0.5rem
    font-size 0.9rem
    color #999

  // Overwrite any theme defaults for the .tm-field if needed
  .tm-field.node-input
    min-width 20rem
    height 2rem
    padding 0 0.5rem
    background transparent
    df()

  .node-wrapper
    display flex
    align-items center
  </style>
  