<template lang="pug">
  tm-page(title='Overview')
  
    // -- "Hero" style search container --
    .hero-search
      .hero-content
        h1.hero-title Explore the Xian Blockchain
        p.hero-subtitle
          | Search for a Block, Transaction Hash, Contract, Address, or XNS Name
        tm-form-struct(@submit.native.prevent="onSubmit")
          .hero-search-bar
            tm-field#search-input(
              type="text"
              placeholder="e.g. 2e7fdde43ed6.., 12345, or alice"
              required
              v-model="query"
            )
            tm-btn(type="submit" icon="search" :disabled="loading" value="Search")
  
    // --- Existing "Blockchain" Part ---
    tm-part(title='Blockchain')
      tm-list-item(dt='Chain ID' :dd='latestBlock.chain_id')
      tm-list-item(dt='Block Height' :dd='num.prettyInt(latestBlock.height)'
        :to="{ name: 'block', params: { block: latestBlock.height }}")
      tm-list-item(dt='Stamp Rate (Stamps/Xian)' :dd='stampRate || ""')
      tm-list-item(dt='Xian Holders' :dd='num.prettyInt(totalHolders || 0)')
      //tm-list-item(dt='Circulating Supply' :dd='num.pretty(circulatingSupply || 0) + " XIAN"')
  
    // --- Last 5 Transactions ---
    tm-part(title='Last 5 Transactions' v-if="lastTxs.length" class="LastTxsTablePart")
      table.LastTxsTable
        thead
          tr
            th Time
            th Hash
            th Contract
            th Function
            th Stamps Used
        tbody
          tr(v-for="tx in lastTxs" :key="tx.hash")
            td {{ tx.formattedTime }}
            td
              router-link(:to="`/tx/${tx.hash}`") {{ shortenHash(tx.hash) }}
            td {{ shortenText(tx.contract) }}
            td {{ shortenText(tx.function) }}
            td {{ tx.stamps }}


      // -- "Show All" button linking to /txs page
      // A centered "Show All" text link below
      .show-all-link-container
        // Plain text link to /txs
        router-link(to="/txs" class="show-all-link")
          i.material-icons(style="vertical-align: middle; margin-right: 0.3rem") chevron_right
          |  Show All Transactions
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
      circulatingSupply: 0,
      lastTxs: []
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

      this.fetchLastTxs();
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

        // You can re-use shorteners from page-transactions or define them inline
    shortenHash(hash) {
      return hash ? `${hash.substring(0, 12)}...${hash.slice(-4)}` : "N/A";
    },
    shortenText(text) {
      if (!text) return "";
      return text.length > 20 ? `${text.substring(0, 20)}...` : text;
    },

    // NEW: fetch the 5 most recent transactions
    async fetchLastTxs() {
      const query = `
        query {
          allTransactions(
            first: 5
            orderBy: BLOCK_HEIGHT_DESC
          ) {
            edges {
              node {
                blockTime
                blockHeight
                hash
                contract
                function
                stamps
              }
            }
          }
        }
      `;
      try {
        const response = await axios.post(`${this.bc.rpc}/graphql`, { query });
        const edges = response.data.data.allTransactions.edges || [];

        this.lastTxs = edges.map((edge) => {
          const tx = edge.node;
          return {
            hash: tx.hash,
            blockHeight: tx.blockHeight,
            contract: tx.contract,
            function: tx.function,
            stamps: tx.stamps,
            // Convert blockTime from nanoseconds to a readable Date string
            formattedTime: new Date(Number(tx.blockTime) / 1e6).toLocaleString(),
          };
        });
      } catch (error) {
        console.error("Error fetching last 5 transactions:", error);
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

  .hero-search
    padding 3rem 1rem
    text-align center
    color #fff

    // The inner container that limits max width
    .hero-content
      max-width 700px
      margin 0 auto

    .hero-title
      font-size 2rem
      margin-bottom 0.5rem
      font-weight 600

    .hero-subtitle
      margin-bottom 2rem
      font-size 1.1rem
      color rgba(#fff, 0.85)

    // The search bar row
    .hero-search-bar
      display flex
      flex-direction row
      justify-content center
      align-items center
      padding 0.5rem
      border-radius 6px
      box-shadow 0 1px 5px rgba(0,0,0,0.2)
      max-width 600px
      margin 0 auto

      // The text input
      .tm-field
        flex 1
        margin-right 0.5rem

      .tm-field input
        width 100%
        border none
        outline none
        padding 0.75rem
        font-size 1rem
        color #333

      // The search button
      .tm-btn
        flex-shrink 0
        margin-left 0.5rem
        min-width 100px
        border-radius 4px
        font-weight 500

  // Keep the existing LastTxsTablePart or other styling as you had
  .LastTxsTablePart
    .tm-part-container
      .tm-part-header
        margin-bottom 0

  .LastTxsTable
    width 100%
    border-collapse collapse
    margin-top 1rem

    th, td
      padding 0.5rem 1rem
      text-align left

    th
      font-weight bold
      font-size 14px

    tr:hover
      background-color var(--hover-bg)


  
  .show-all-link-container
    text-align center
    margin-top 1rem

  .show-all-link
    text-decoration none
    font-weight 500

    &:hover
      text-decoration underline
      cursor pointer


  </style>
  