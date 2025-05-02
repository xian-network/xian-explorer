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
  
    // --- 1) Blockchain Section ---
    tm-part(title='Blockchain')
      tm-list-item(dt='Chain ID' :dd='latestBlock.chain_id')
      tm-list-item(
        dt='Block Height'
        :dd='num.prettyInt(latestBlock.height)'
        :to="{ name: 'block', params: { block: latestBlock.height }}"
      )
      tm-list-item(dt='Stamp Rate (Stamps/Xian)' :dd='stampRate || ""')
      // you could add more chain-specific items here
  
    // --- 2) Xian Coin Section ---
    tm-part(title='Xian Coin')
      tm-list-item(dt='Xian Holders' :dd='num.prettyInt(totalHolders || 0)')
      tm-list-item(dt='Total Supply' :dd='num.prettyInt(totalSupply) + " XIAN"')
      tm-list-item(dt='Circulating Supply' :dd='num.prettyInt(circulatingSupply) + " XIAN"')
      tm-list-item(dt='Price' :dd='xianPrice ? `$${xianPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 })}` : "—"')
      tm-list-item(dt='Market Cap' :dd='xianPrice ? `$${(xianPrice * circulatingSupply).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"')

  
    // --- 3) Last 5 Transactions (always visible) ---
    tm-part(title='Last 5 Transactions' class="LastTxsTablePart")
      table.BlocksTable
        thead
          tr
            th Time
            th Hash
            th Contract
            th Function
            th Fee (Stamps / XIAN)
        tbody
          // Show a "Loading..." row if lastTxs is empty
          tr(v-if="lastTxs.length === 0")
            td(colspan="5") Loading...
          // Show the transactions once loaded
          tr(v-for="tx in lastTxs" :key="tx.hash" v-else)
            td {{ tx.formattedTime }}
            td
              router-link(:to="`/tx/${tx.hash}`") {{ shortenHash(tx.hash) }}
            td {{ shortenText(tx.contract) }}
            td {{ shortenText(tx.function) }}
            td
              | {{ num.prettyInt(tx.stamps) }}
              span(style="opacity:0.6")   /  
                | {{ tx.feeXian }}
  
      .show-all-link-container
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
        "bc",
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
        return (
          votingValidators(this.validators).length +
          " voting / " +
          this.validators.length +
          " total"
        );
      },
      prevotes() {
        if (this.consensusState && this.consensusState.height_vote_set) {
          let prevotes = this.consensusState.height_vote_set[0].prevotes_bit_array;
          let split = prevotes.split(" ");
          let onlineSteak = split[1].split("/")[0];
          let totalSteak = split[1].split("/")[1];
          let minimumSteak = Math.round(totalSteak * 0.6667);
          if (onlineSteak >= minimumSteak) {
            return split[3] * 100 + "% prevoted";
          } else {
            return (
              split[3] * 100 +
              "% prevoted (" +
              onlineSteak +
              "steak, need " +
              minimumSteak +
              "steak)"
            );
          }
        }
        return "Loading...";
      },
      precommits() {
        if (this.consensusState && this.consensusState.height_vote_set) {
          let precommits =
            this.consensusState.height_vote_set[0].precommits_bit_array;
          let split = precommits.split(" ");
          let onlineSteak = split[1].split("/")[0];
          let totalSteak = split[1].split("/")[1];
          let minimumSteak = Math.round(totalSteak * 0.6667);
          if (onlineSteak >= minimumSteak) {
            return Math.round(split[3] * 100) + "% precommitted";
          } else {
            return (
              Math.round(split[3] * 100) +
              "% precommitted (" +
              onlineSteak +
              "steak, need " +
              minimumSteak +
              "steak)"
            );
          }
        }
        return "Loading...";
      }
    },
    data() {
      return {
        query: "",
        loading: false,
  
        num: num,
        stampRate: null,
        totalTxs: 0,
        totalHolders: 0,
  
        // We'll track total/excluded/circulating
        totalSupply: 0,
        excludedSupply: 0,
        circulatingSupply: 0,
  
        // Show empty array by default for immediate rendering
        lastTxs: [],
        xianPrice: null,
      };
    },
    async mounted() {
      this.setMetaDescription(
        "Xian Explorer is a blockchain explorer for the Xian blockchain..."
      );
  
      await this.fetchStampRate();
      await this.fetchTotalTxs();
      await this.fetchTotalHolders();
      await this.fetchXianPrice();
  
      // Summation (in parallel)
      await Promise.all([this.fetchTotalSupply(), this.fetchExcludedSupply()]);
      this.circulatingSupply = this.totalSupply - this.excludedSupply;
  
      // last 5 tx
      await this.fetchLastTxs();
    },
    methods: {
      readableDate,
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
  
      // Stamp rate
      async fetchStampRate() {
        try {
          const response = await fetch(
            this.bc.rpc + '/abci_query?path="/get/stamp_cost.S:value"'
          );
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
      async fetchXianPrice() {
      const query = `
        query {
          allEvents(
            condition: { contract: "con_pairs", event: "Swap" },
            filter: { dataIndexed: { contains: { pair: "1" } } },
            orderBy: CREATED_DESC,
            first: 1
          ) {
            edges { node { data } }
          }
        }
      `;
      try {
        const res = await axios.post(`${this.bc.rpc}/graphql`, { query });
        const swap = res.data.data.allEvents.edges[0].node.data;

        const a0in = parseFloat(swap.amount0In || 0);
        const a1out = parseFloat(swap.amount1Out || 0);
        const a1in = parseFloat(swap.amount1In || 0);
        const a0out = parseFloat(swap.amount0Out || 0);

        // Assuming USDC is token0 and XIAN is token1
        if (a0in > 0 && a1out > 0) this.xianPrice = a0in / a1out;
        else if (a1in > 0 && a0out > 0) this.xianPrice = a0out / a1in;
        else this.xianPrice = 0;

      } catch (err) {
        console.error("Failed to fetch XIAN price:", err);
        this.xianPrice = 0;
      }
    },
      // Xian holders
      async fetchTotalHolders() {
        try {
          const query = `
            query {
              allStates(
                filter: {
                  and: {
                    key: { startsWith: "currency.balances:", notLike: "%:%:%" }
                  }
                }
              ) {
                totalCount
              }
            }
          `;
          const response = await axios.post(`${this.bc.rpc}/graphql`, { query });
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
  
      // Count transactions
      async fetchTotalTxs() {
        try {
          const response = await fetch(
            `${this.bc.rpc}/tx_search?query="tx.height>0"&per_page=1&page=1`
          );
          const data = await response.json();
          if (data && data.result && data.result.total_count) {
            this.totalTxs = parseInt(data.result.total_count, 10);
          } else {
            console.error("Error fetching total transactions: Invalid response");
            this.totalTxs = "Error";
          }
        } catch (error) {
          console.error("Error fetching total transactions:", error);
          this.totalTxs = "Error";
        }
      },
  
      // Summation of all nonzero addresses in chunks
      async fetchTotalSupply() {
        // 1) get totalCount
        const countQuery = `
          query {
            allStates(
              filter: {
                and: {
                  key: { startsWith: "currency.balances:", notLike: "%:%:%" }
                  valueNumeric: { greaterThan: "0" }
                }
              }
            ) {
              totalCount
            }
          }
        `;
        try {
          let resp = await axios.post(`${this.bc.rpc}/graphql`, { query: countQuery });
          const totalCount = resp.data.data.allStates.totalCount || 0;
          if (totalCount === 0) {
            this.totalSupply = 0;
            return;
          }
  
          const chunkSize = 2000;
          let offset = 0;
          let runningSum = 0;
  
          while (offset < totalCount) {
            const chunkQuery = `
              query FetchChunk($first: Int!, $offset: Int!) {
                allStates(
                  filter: {
                    and: {
                      key: { startsWith: "currency.balances:", notLike: "%:%:%" }
                      valueNumeric: { greaterThan: "0" }
                    }
                  }
                  orderBy: VALUE_DESC
                  first: $first
                  offset: $offset
                ) {
                  edges {
                    node {
                      value
                    }
                  }
                }
              }
            `;
            const variables = { first: chunkSize, offset: offset };
            const chunkResp = await axios.post(`${this.bc.rpc}/graphql`, {
              query: chunkQuery,
              variables
            });
            const edges = chunkResp.data.data.allStates.edges || [];
  
            for (let i = 0; i < edges.length; i++) {
              const node = edges[i].node;
              if (!(node && node.value)) continue;
              runningSum += parseFloat(node.value) || 0;
            }
  
            if (edges.length < chunkSize) {
              break; // done
            }
            offset += chunkSize;
          }
  
          this.totalSupply = runningSum;
        } catch (err) {
          console.error("Error fetching total supply (chunk-based):", err);
          this.totalSupply = 0;
        }
      },
  
      // Single small query for excluded addresses
      async fetchExcludedSupply() {
        const excludedKeys = [
          "currency.balances:team_lock",
          "currency.balances:dao_funding_stream",
          "currency.balances:dao",
          "currency.balances:con_team_y1_linear_vesting",
          "currency.balances:masternodes",
          "currency.balances:con_farm_xian_usdc"
        ];
        const query = `
          query {
            allStates(
              filter: {
                key: { in: [${excludedKeys.map(k => `"${k}"`).join(", ")}] }
              }
            ) {
              edges {
                node {
                  value
                }
              }
            }
          }
        `;
        try {
          const resp = await axios.post(`${this.bc.rpc}/graphql`, { query });
          const edges = resp.data.data.allStates.edges || [];
          let sum = 0;
          for (let i = 0; i < edges.length; i++) {
            const node = edges[i].node;
            if (!(node && node.value)) continue;
            sum += parseFloat(node.value) || 0;
          }
          this.excludedSupply = sum;
        } catch (err) {
          console.error("Error fetching excluded addresses:", err);
          this.excludedSupply = 0;
        }
      },
  
      // 5) Last 5 tx
      async fetchLastTxs() {
  const query = `
    query {
      allTransactions(first: 5, orderBy: BLOCK_HEIGHT_DESC) {
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
    const { data } = await axios.post(`${this.bc.rpc}/graphql`, { query });
    const edges = data.data.allTransactions.edges || [];

    this.lastTxs = edges.map(({ node: tx }) => {
      const feeXian =
        this.stampRate ? (tx.stamps / this.stampRate).toFixed(3) : "—";                 // fallback if stampRate unavailable
      return {
        hash: tx.hash,
        blockHeight: tx.blockHeight,
        contract: tx.contract,
        function: tx.function,
        stamps: tx.stamps,
        feeXian,                              // <‑‑ new field
        formattedTime: new Date(
          Number(tx.blockTime) / 1e6          // blockTime is ns
        ).toLocaleString()
      };
    });
  } catch (err) {
    console.error("Error fetching last 5 txs:", err);
  }
},

  
      // Helper shorteners
      shortenHash(hash) {
        return hash ? hash.substring(0, 12) + "..." + hash.slice(-4) : "N/A";
      },
      shortenText(text) {
        if (!text) return "";
        return text.length > 20 ? text.substring(0, 20) + "..." : text;
      },
  
      // Searching
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
          // 1) check as XNS name
          const address = await this.resolveXnsName(trimmedQuery);
          if (address && address !== "None") {
            this.$router.push({ name: "address", params: { address } });
            return;
          }
  
          // 2) if 64 hex, treat as tx or address
          if (/^[a-fA-F0-9]{64}$/.test(trimmedQuery)) {
            const txExists = await this.checkTxExists(trimmedQuery);
            if (txExists) {
              this.$router.push({ name: "tx", params: { hash: trimmedQuery } });
              return;
            }
            this.$router.push({ name: "address", params: { address: trimmedQuery } });
          } else if (/^\d+$/.test(trimmedQuery)) {
            // 3) numeric => block
            this.$router.push({ name: "block", params: { block: trimmedQuery } });
          } else {
            // 4) else check contract
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
            kwargs: { name }
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
          if (parsed.status !== 1 && parsed.result && parsed.result.replace(/'/g, "") !== "None") {
            return parsed.result.replace(/'/g, "");
          }
          return null;
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
          const response = await fetch(
            `${this.bc.rpc}/abci_query?path="/contract/${contractName}"`
          );
          const data = await response.json();
          return data.result && data.result.response && data.result.response.value != null;
        } catch (err) {
          console.error("Contract lookup error:", err);
          return false;
        }
      }
    }
  };
  </script>
  
  <style lang="stylus">
  @require '~variables'
  
  // Hero search container
  .hero-search
    padding 3rem 1rem
    text-align center
    color #fff
  
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
  
      .tm-btn
        flex-shrink 0
        margin-left 0.5rem
        min-width 100px
        border-radius 4px
        font-weight 500
  
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
  