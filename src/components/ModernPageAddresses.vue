<template>
  <div class="modern-page-addresses">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Top Addresses</h1>
        <p class="page-description">
          Explore the richest addresses on the Xian blockchain. View wallet balances, rankings, and address details.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="content-container">
        <!-- Table Controls -->
        <div class="table-controls">
          <div class="pagination-controls">
            <router-link 
              v-if="hasPrevPage"
              :to="{ path: '/addresses', query: prevQuery }" 
              class="nav-button prev-button"
            >
              <i class="material-icons">chevron_left</i>
              Previous
            </router-link>
            <router-link 
              v-if="hasNextPage"
              :to="{ path: '/addresses', query: nextQuery }" 
              class="nav-button next-button"
            >
              Next
              <i class="material-icons">chevron_right</i>
            </router-link>
          </div>
         
        </div>

        <!-- Addresses Table -->
        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Address</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(wallet, index) in addresses" :key="wallet.address" class="table-row">
                <td class="rank-cell">
                  <div class="rank-badge">
                    {{ (currentPage - 1) * itemsPerPage + index + 1 }}
                  </div>
                </td>
                <td class="address-cell">
                  <router-link :to="`/addresses/${wallet.address}`" class="address-link">
                    <div class="address-info">
                      <span class="address-name">{{ wallet.displayName }}</span>
                      <span v-if="wallet.displayName !== wallet.address" class="address-hash">{{ wallet.address }}</span>
                    </div>
                  </router-link>
                </td>
                <td class="balance-cell">
                  <div class="balance-info">
                    <span class="balance-amount">{{ formatBalance(wallet.balance) }}</span>
                    <span class="balance-currency">XIAN</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading addresses...</p>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && addresses.length === 0" class="empty-state">
          <i class="material-icons">account_balance_wallet</i>
          <h3>No addresses found</h3>
          <p>There are no addresses to display at the moment.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import num from "../scripts/num";
import { mapGetters } from "vuex";

// manual aliases you used before
const ADDRESS_ALIASES = {
  "2e7fdde43ed628f2d8631dad8a022e26349bb3d14de056ed21dcc6d52ae5e7cc": "Dex-Trade.com",
  "3e3aeaf504805eac1efc8e91fa42e5326fa6f6c22cbc4ee98b1f55f55aedccd5": "Bridge Wallet",
};
const maxItemsPerPage = 20;
// Helper function for address name resolution
async function execute_get_address_to_main_name(address, rpc) {
  // alias fallback (like your old richlist)
  if (ADDRESS_ALIASES[address]) return ADDRESS_ALIASES[address];

  try {
    const payload = {
      sender: "",
      contract: "con_name_service_final",
      function: "get_address_to_main_name",
      kwargs: { address }
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const hex = toHexString(bytes);

    // use simulate_tx like on your other pages
    const res = await fetch(`${rpc}/abci_query?path="/simulate_tx/${hex}"`);
    const data = await res.json();

    const b64 = data && data.result && data.result.response && data.result.response.value;
    if (!b64 || b64 === "AA==") return "None";

    let decoded;
    try {
      decoded = JSON.parse(atob(b64));
    } catch (e) {
      return "None";
    }

    if (!decoded || decoded.status === 1 || !decoded.result || decoded.result === "None") {
      return "None";
    }

    // strip stray single quotes your service sometimes returns
    return String(decoded.result).replace(/'/g, "");
  } catch (error) {
    console.log("Error resolving address name:", error);
    return "None";
  }
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

export default {
  name: "modern-page-addresses",
  data() {
    return {
      addresses: [],
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
      loading: true,
    };
  },
  computed: {
    ...mapGetters([
      "blockchain",
      "rpc"
    ]),
    hasPrevPage() {
      return this.currentPage > 1;
    },
    hasNextPage() {
      return this.addresses.length === this.itemsPerPage;
    },
    prevQuery() {
      const prevPage = Math.max(1, this.currentPage - 1);
      return prevPage === 1 ? {} : { page: prevPage };
    },
    nextQuery() {
      return { page: this.currentPage + 1 };
    }
  },
  async mounted() {
    await this.fetchAddresses();
  },
  watch: {
    '$route'() {
      this.fetchAddresses();
    }
  },
  methods: {
    async fetchAddresses() {
      this.loading = true;
      try {
        const page = parseInt(this.$route.query.page) || 1;
        this.currentPage = page;

        const offset = (this.currentPage - 1) * this.itemsPerPage;
        const query = `
          query RichList($limit: Int!, $offset: Int!) {
            allStates(
              filter: {and: {key: {startsWith: "currency.balances:", notLike: "%:%:%"}, valueNumeric: {greaterThan: "0"}}}
              first: $limit
              offset: $offset
              orderBy: VALUE_NUMERIC_DESC
            ) {
              edges {
                node {
                  key
                  value
                }
              }
            }
          }
        `;

        const variables = {
          limit: this.itemsPerPage,
          offset: offset
        };

        // 1) Fetch addresses & balances from GraphQL
        const response = await axios.post(`${this.blockchain.rpc}/graphql`, {
          query,
          variables
        });
        const edges = response.data.data.allStates.edges;

        // 2) Map to simple objects
        let addressesData = edges.map((edge) => {
          const { key, value } = edge.node;
          // key is something like "currency.balances:abcdef123..."
          const address = key.split(":")[1];
          return {
            address,
            balance: parseFloat(value).toFixed(8),
            displayName: null
          };
        });

        // 3) Look up each address's main name from the Name Service
        // Temporarily disabled to test if this is causing the issue
        
        const resolvedNames = await Promise.all(
          addressesData.map((item) =>
            execute_get_address_to_main_name(item.address, this.blockchain.rpc)
          )
        );

        // 4) Insert name into the array if it's not "None"
        addressesData = addressesData.map((item, i) => {
          const maybeName = resolvedNames[i];
          if (maybeName !== "None" && maybeName) {
            item.displayName = maybeName;
          } else {
            item.displayName = item.address;
          }
          return item;
        });
        

        // 5) Finalize
        this.addresses = addressesData;
      } catch (error) {
        console.error("Error fetching addresses:", error);
        this.addresses = [];
      } finally {
        this.loading = false;
      }
    },
    formatBalance(balance) {
      return num.full(balance);
    }
  }
};
</script>

<style lang="stylus" scoped>
.modern-page-addresses
  min-height calc(100vh - 72px)
  background linear-gradient(135deg, #0f1419 0%, #1a2332 100%)
  color #ffffff

.page-header
  background linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)
  border-bottom 1px solid rgba(255, 255, 255, 0.1)
  padding 3rem 0

.header-content
  max-width 1200px
  margin 0 auto
  padding 0 2rem

.page-title
  font-size 3rem
  font-weight 700
  margin 0 0 1rem 0
  background linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)
  -webkit-background-clip text
  -webkit-text-fill-color transparent
  background-clip text

.page-description
  font-size 1.125rem
  color rgba(255, 255, 255, 0.7)
  margin 0 auto
  max-width 600px
  text-align center

.main-content
  padding 2rem 0

.content-container
  max-width 1200px
  margin 0 auto
  padding 0 2rem

.table-controls
  display flex
  justify-content space-between
  align-items center
  margin-bottom 2rem
  flex-wrap wrap
  gap 1rem

.pagination-controls
  display flex
  gap 1rem

.nav-button
  display flex
  align-items center
  gap 0.5rem
  padding 0.75rem 1.5rem
  background rgba(20, 184, 166, 0.1)
  border 1px solid rgba(20, 184, 166, 0.3)
  border-radius 8px
  color #14b8a6
  text-decoration none
  font-weight 500
  transition all 0.2s ease
  
  &:hover
    background rgba(20, 184, 166, 0.2)
    border-color rgba(20, 184, 166, 0.5)
    transform translateY(-1px)

  .material-icons
    font-size 1.25rem

.page-info
  padding 0.75rem 1.5rem
  background rgba(255, 255, 255, 0.05)
  border-radius 8px
  color rgba(255, 255, 255, 0.7)
  font-weight 500

.table-container
  background rgba(255, 255, 255, 0.05)
  border-radius 12px
  border 1px solid rgba(255, 255, 255, 0.1)

.modern-table
  width 100%
  border-collapse collapse

  thead
    background rgba(255, 255, 255, 0.1)
    
    th
      padding 1.5rem 2rem
      text-align left
      font-weight 600
      font-size 0.875rem
      text-transform uppercase
      letter-spacing 0.05em
      color rgba(255, 255, 255, 0.8)
      border-bottom 1px solid rgba(255, 255, 255, 0.1)

  tbody
    .table-row
      border-bottom 1px solid rgba(255, 255, 255, 0.05)
      transition all 0.2s ease
      
      &:hover
        background rgba(255, 255, 255, 0.05)
      
      &:last-child
        border-bottom none

      td
        padding 1.5rem 2rem
        vertical-align middle

.rank-cell
  width 80px

.rank-badge
  display inline-flex
  align-items center
  justify-content center
  width 40px
  height 40px
  background linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)
  border-radius 50%
  font-weight 700
  font-size 0.875rem
  color #ffffff

.address-cell
  .address-link
    text-decoration none
    color inherit
    display block
    
    &:hover .address-name
      color #fff

.address-info
  display flex
  flex-direction column
  gap 0.25rem

.address-name
  font-weight 600
  font-size 1rem
  color #00d4ff
  transition color 0.2s ease

.address-hash
  font-size 0.875rem
  color rgba(255, 255, 255, 0.5)
  font-family 'JetBrains Mono', monospace
  word-break break-all

.balance-cell
  text-align right

.balance-info
  display flex
  flex-direction column
  align-items flex-end
  gap 0.25rem

.balance-amount
  font-weight 700
  font-size 1.125rem
  color #00d4ff

.balance-currency
  font-size 0.875rem
  color rgba(255, 255, 255, 0.5)
  font-weight 500

.loading-container
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  text-align center

.loading-spinner
  width 40px
  height 40px
  border 3px solid rgba(20, 184, 166, 0.3)
  border-top 3px solid #14b8a6
  border-radius 50%
  animation spin 1s linear infinite
  margin-bottom 1rem

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)

.empty-state
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  text-align center
  color rgba(255, 255, 255, 0.6)

  .material-icons
    font-size 4rem
    margin-bottom 1rem
    color rgba(255, 255, 255, 0.3)

  h3
    font-size 1.5rem
    margin 0 0 0.5rem 0
    color rgba(255, 255, 255, 0.8)

  p
    margin 0
    font-size 1rem

// Responsive Design
@media (max-width: 768px)
  .page-header
    padding 2rem 0

  .header-content
    padding 0 1rem

  .page-title
    font-size 2rem

  .content-container
    padding 0 2rem

  .table-controls
    flex-direction column
    align-items stretch

  .pagination-controls
    justify-content center

  .modern-table
    thead th
      padding 1rem
      font-size 0.75rem
    
    tbody td
      padding 1rem

  .rank-cell
    width 60px

  .rank-badge
    width 32px
    height 32px
    font-size 0.75rem

  .address-info
    gap 0.125rem

  .address-name
    font-size 0.875rem

  .address-hash
    font-size 0.75rem

  .balance-amount
    font-size 1rem

  .balance-currency
    font-size 0.75rem
</style>