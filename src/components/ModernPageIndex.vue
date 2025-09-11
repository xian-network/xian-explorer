<template lang="pug">
.modern-explorer
  // Hero Section
  .hero-section
    .hero-container
      .hero-content
        h1.hero-title
          | Explore the 
          span.text-gradient-primary Xian Blockchain
        p.hero-subtitle
          | Discover transactions, blocks, contracts, and addresses on the Xian network with ease.
        
        // Modern Search Bar
        .hero-search
          .search-container
            input.search-input(
              type="text"
              placeholder="Search by transaction hash, block number, address, or contract..."
              v-model="query"
              @keyup.enter="onSubmit"
            )
            button.search-btn(@click="onSubmit" :disabled="loading")
              i.material-icons search
              span Search
  
  // Stats Overview
  .stats-section
    .container
      .stats-grid
        .stat-card
          .stat-value {{ num.prettyInt(latestBlock.height) }}
          .stat-label Latest Block
          
        .stat-card
          .stat-value {{ num.prettyInt(totalSupply) }}
          .stat-label Total XIAN Supply
          
        .stat-card
          .stat-value {{ num.prettyInt(totalHolders || 0) }}
          .stat-label XIAN Token Holders
          
        .stat-card
          .stat-value {{ xianPrice ? `$${xianPrice.toFixed(4)}` : "—" }}
          .stat-label XIAN Price
          .stat-change(
            :class="xianChange24h > 0 ? 'positive' : (xianChange24h < 0 ? 'negative' : '')"
            v-if="xianChange24h !== null"
          )
            | {{ xianChange24h > 0 ? '+' : '' }}{{ xianChange24h.toFixed(2) }}%
  
  // Network Information
  .network-section
    .container
      .section-header
        h2.section-title Network Overview
        p.section-subtitle Real-time information about the Xian blockchain
      
      .network-grid
        .network-card
          .card-header
            .card-icon
              i.material-icons link
            .card-title Blockchain Info
          .card-content
            .info-item
              .info-label Chain ID
              .info-value {{ latestBlock.chain_id }}
            .info-item
              .info-label Block Height
              .info-value
                router-link(:to="{ name: 'block', params: { block: latestBlock.height }}")
                  | {{ num.prettyInt(latestBlock.height) }}
            .info-item
              .info-label Stamp Rate
              .info-value {{ stampRate || "100" }} Stamps/XIAN
        
        .network-card
          .card-header
            .card-icon
              i.material-icons account_balance_wallet
            .card-title Token Economics
          .card-content
            .info-item
              .info-label Market Cap
              .info-value {{ xianPrice ? `$${(xianPrice * circulatingSupply).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" }}
            .info-item
              .info-label Circulating Supply
              .info-value {{ num.prettyInt(circulatingSupply) }} XIAN
            .info-item
              .info-label 24h Volume
              .info-value {{ xianVolume24h ? `$${xianVolume24h.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—" }}
  
  // Recent Transactions
  .transactions-section
    .container
      .section-header
        h2.section-title Recent Transactions
        p.section-subtitle Latest activity on the Xian network
      
      .transactions-card
        .data-table-modern(v-if="lastTxs.length > 0")
          table
            thead
              tr
                th Time
                th Transaction Hash
                th Contract
                th Function
                th Fee
            tbody
              tr(v-for="tx in lastTxs" :key="tx.hash")
                td
                  .time-cell
                    .time-value {{ tx.formattedTime }}
                td
                  .hash-cell
                    router-link(:to="`/tx/${tx.hash}`" class="hash-link")
                      | {{ shortenHash(tx.hash) }}
                    button.copy-btn(@click="copyToClipboard(tx.hash)")
                      i.material-icons content_copy
                td
                  .contract-cell {{ shortenText(tx.contract) }}
                td
                  .function-cell {{ shortenText(tx.function) }}
                td
                  .fee-cell
                    .fee-stamps {{ num.prettyInt(tx.stamps) }}
                    .fee-xian {{ tx.feeXian }} XIAN
        
        .loading-state(v-else)
          .loading-spinner
          p Loading recent transactions...
        
        .view-all-link
          router-link(to="/txs" class="btn-modern btn-secondary")
            span View All Transactions
            i.material-icons chevron_right
</template>

<script>
import axios from "axios";
import num from "../scripts/num";
import { mapGetters } from "vuex";
import { readableDate } from "../scripts/utils";

export default {
  name: "modern-page-index",
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
      xianChange24h: null,
      xianVolume24h: null
    };
  },
  computed: {
    ...mapGetters(["latestBlock", "bc"])
  },
  async mounted() {
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
      const nowQuery = `
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

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("Z", "");
      const volumeQuery = `
        query {
          allEvents(
            condition: { contract: "con_pairs", event: "Swap" },
            filter: {
              dataIndexed: { contains: { pair: "1" } },
              created: { greaterThan: "${since}" }
            },
            first: 1000
          ) {
            edges { node { data } }
          }
        }
      `;

      try {
        const [resNow, resVol] = await Promise.all([
          axios.post(`${this.bc.rpc}/graphql`, { query: nowQuery }),
          axios.post(`${this.bc.rpc}/graphql`, { query: volumeQuery })
        ]);

        const latest = resNow && resNow.data && resNow.data.data && resNow.data.data.allEvents && resNow.data.data.allEvents.edges && resNow.data.data.allEvents.edges[0] && resNow.data.data.allEvents.edges[0].node && resNow.data.data.allEvents.edges[0].node.data;
        const events = resVol && resVol.data && resVol.data.data && resVol.data.data.allEvents && resVol.data.data.allEvents.edges;

        const a0in = parseFloat(latest.amount0In || 0);
        const a1out = parseFloat(latest.amount1Out || 0);
        const a1in = parseFloat(latest.amount1In || 0);
        const a0out = parseFloat(latest.amount0Out || 0);

        let current = 0;
        if (a0in > 0 && a1out > 0) current = a0in / a1out;
        else if (a1in > 0 && a0out > 0) current = a0out / a1in;

        let totalVolume = 0;
        let firstPrice = 0;

        for (const { node: { data } } of events) {
          const a0in = parseFloat(data.amount0In || 0);
          const a1out = parseFloat(data.amount1Out || 0);
          const a1in = parseFloat(data.amount1In || 0);
          const a0out = parseFloat(data.amount0Out || 0);
          totalVolume += parseFloat(data.amount0In || 0); // buy XIAN with USDC
          totalVolume += parseFloat(data.amount0Out || 0); // sell XIAN for USDC
          if (a0in > 0 && a1out > 0) {
            if (!firstPrice) firstPrice = a0in / a1out;
          } else if (a1in > 0 && a0out > 0) {
            if (!firstPrice) firstPrice = a0out / a1in;
          }
        }

        this.xianPrice = current;
        this.xianVolume24h = totalVolume;
        this.xianChange24h = firstPrice > 0 ? ((current - firstPrice) / firstPrice) * 100 : null;
      } catch (err) {
        console.error("Failed to fetch XIAN price/24h volume/change:", err);
        this.xianPrice = 0;
        this.xianChange24h = null;
        this.xianVolume24h = null;
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

    // Last 5 tx
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
            this.stampRate ? (tx.stamps / this.stampRate).toFixed(3) : "—";
          return {
            hash: tx.hash,
            blockHeight: tx.blockHeight,
            contract: tx.contract,
            function: tx.function,
            stamps: tx.stamps,
            feeXian,
            formattedTime: new Date(
              Number(tx.blockTime) / 1e6
            ).toLocaleString()
          };
        });
      } catch (err) {
        console.error("Error fetching last 5 txs:", err);
      }
    },
    
    onSubmit() {
      if (!this.query.trim()) return;
      
      this.loading = true;
      // Navigate to search results
      this.$router.push({
        name: "search",
        query: { q: this.query.trim() }
      });
      this.loading = false;
    },
    
    shortenHash(hash) {
      if (!hash) return "";
      return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
    },
    
    shortenText(text) {
      if (!text) return "";
      return text.length > 20 ? `${text.slice(0, 20)}...` : text;
    },
    
    copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        // Could add a toast notification here
        console.log("Copied to clipboard:", text);
      });
    }
  }
};
</script>

<style lang="stylus" scoped>
@import '../styles/modern-variables.styl'

.modern-explorer
  background var(--bg-primary)
  color var(--text-primary)
  font-family var(--font-primary)

// Hero Section
.hero-section
  padding var(--space-20) 0 var(--space-16)
  text-align center
  position relative
  
.hero-container
  max-width 1200px
  margin 0 auto
  padding 0 var(--space-6)

.hero-title
  font-size var(--text-5xl)
  font-weight var(--font-bold)
  margin-bottom var(--space-6)
  line-height 1.1
  
  @media (max-width: 768px)
    font-size var(--text-4xl)

.hero-subtitle
  font-size var(--text-xl)
  color var(--text-secondary)
  margin-bottom var(--space-12)
  max-width 600px
  margin-left auto
  margin-right auto
  line-height 1.6
  
  @media (max-width: 768px)
    font-size var(--text-lg)
    margin-bottom var(--space-8)

.hero-search
  max-width 700px
  margin 0 auto

.search-container
  display flex
  gap var(--space-3)
  background var(--bg-card)
  padding var(--space-2)
  border-radius var(--radius-2xl)
  border 1px solid var(--border-card)
  box-shadow var(--shadow-lg)
  
  @media (max-width: 768px)
    flex-direction column
    gap var(--space-2)

.search-input
  flex 1
  background transparent
  border none
  padding var(--space-4) var(--space-6)
  color var(--text-primary)
  font-size var(--text-lg)
  border-radius var(--radius-xl)
  
  &:focus
    outline none
  
  &::placeholder
    color var(--text-muted)

.search-btn
  display inline-flex
  align-items center
  justify-content center
  padding var(--space-4) var(--space-8)
  border-radius var(--radius-xl)
  font-weight var(--font-medium)
  font-size var(--text-lg)
  transition all var(--transition-fast)
  cursor pointer
  border none
  text-decoration none
  background var(--primary-gradient)
  color white
  box-shadow var(--shadow-md)
  
  &:hover
    box-shadow var(--shadow-lg), var(--shadow-glow)
    transform translateY(-1px)
  
  i
    margin-right var(--space-2)

// Stats Section
.stats-section
  padding var(--space-16) 0
  background var(--bg-secondary)

.container
  max-width 1200px
  margin 0 auto
  padding 0 var(--space-6)

// Network Section
.network-section
  padding var(--space-16) 0

.section-header
  text-align center
  margin-bottom var(--space-12)

.section-title
  font-size var(--text-3xl)
  font-weight var(--font-bold)
  margin-bottom var(--space-4)

.section-subtitle
  font-size var(--text-lg)
  color var(--text-secondary)

.network-grid
  display grid
  grid-template-columns repeat(auto-fit, minmax(400px, 1fr))
  gap var(--space-8)
  
  @media (max-width: 768px)
    grid-template-columns 1fr
    gap var(--space-6)

.network-card
  background var(--bg-card)
  border 1px solid var(--border-card)
  border-radius var(--radius-xl)
  box-shadow var(--shadow-md)
  transition all var(--transition-normal)
  padding var(--space-8)
  
  &:hover
    background var(--bg-card-hover)
    box-shadow var(--shadow-lg)
    transform translateY(-2px)

.card-header
  display flex
  align-items center
  margin-bottom var(--space-6)

.card-icon
  width 48px
  height 48px
  background var(--primary-gradient)
  border-radius var(--radius-lg)
  display flex
  align-items center
  justify-content center
  margin-right var(--space-4)
  
  i
    color white
    font-size 24px

.card-title
  font-size var(--text-xl)
  font-weight var(--font-semibold)

.card-content
  space-y var(--space-4)

.info-item
  display flex
  justify-content space-between
  align-items center
  padding var(--space-3) 0
  border-bottom 1px solid var(--border-primary)
  
  &:last-child
    border-bottom none

.info-label
  color var(--text-secondary)
  font-size var(--text-sm)

.info-value
  font-weight var(--font-medium)
  
  a
    color var(--text-accent)
    text-decoration none
    
    &:hover
      text-decoration underline

// Transactions Section
.transactions-section
  padding var(--space-16) 0
  background var(--bg-secondary)

.transactions-card
  background var(--bg-card)
  border 1px solid var(--border-card)
  border-radius var(--radius-xl)
  box-shadow var(--shadow-md)
  transition all var(--transition-normal)
  padding var(--space-8)
  
  &:hover
    background var(--bg-card-hover)
    box-shadow var(--shadow-lg)
    transform translateY(-2px)

.time-cell
  .time-value
    font-size var(--text-sm)
    color var(--text-secondary)

.hash-cell
  display flex
  align-items center
  gap var(--space-2)

.hash-link
  color var(--text-accent)
  text-decoration none
  font-family var(--font-mono)
  font-size var(--text-sm)
  
  &:hover
    text-decoration underline

.copy-btn
  background transparent
  border none
  color var(--text-muted)
  cursor pointer
  padding var(--space-1)
  border-radius var(--radius-sm)
  
  &:hover
    color var(--text-accent)
    background var(--bg-tertiary)
  
  i
    font-size 16px

.contract-cell, .function-cell
  font-family var(--font-mono)
  font-size var(--text-sm)
  color var(--text-secondary)

.fee-cell
  text-align right
  
  .fee-stamps
    font-weight var(--font-medium)
    
  .fee-xian
    font-size var(--text-sm)
    color var(--text-muted)

.loading-state
  text-align center
  padding var(--space-12)
  
  .loading-spinner
    width 40px
    height 40px
    border 3px solid var(--border-primary)
    border-top 3px solid var(--text-accent)
    border-radius 50%
    animation spin 1s linear infinite
    margin 0 auto var(--space-4)
  
  p
    color var(--text-secondary)

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)

.view-all-link
  text-align center
  margin-top var(--space-8)
  
  .btn-modern
    i
      margin-left var(--space-2)

// Stat card enhancements
.stat-value-unit
  font-size var(--text-lg)
  color var(--text-secondary)
  margin-left var(--space-2)

.stat-change
  font-size var(--text-sm)
  font-weight var(--font-medium)
  margin-top var(--space-1)
  
  &.positive
    color var(--text-success)
    
  &.negative
    color var(--text-error)
</style>