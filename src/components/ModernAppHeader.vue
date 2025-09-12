<template lang="pug">
header.modern-header
  .header-container
    // Logo and Brand
    .header-brand
      router-link.brand-link(to="/")
        .brand-logo
          img(src="@/assets/images/xian-white.svg" alt="Xian")
        .brand-text
          .brand-name Xian Explorer
          .brand-network Mainnet
    
    // Main Navigation
    nav.header-nav(v-if="config.desktop")
      .nav-links
        router-link.nav-link(to="/" exact-active-class="active")
          span Overview
        router-link.nav-link(to="/blocks" active-class="active")
          span Blocks
        router-link.nav-link(to="/txs" active-class="active")
          span Transactions
        router-link.nav-link(to="/contracts" active-class="active")
          span Contracts
        router-link.nav-link(to="/tokens" active-class="active")
          span Tokens
        router-link.nav-link(to="/addresses" active-class="active")
          span Addresses
    
    // Header Actions
    .header-actions
      // Quick Search (Desktop)
      .quick-search(v-if="config.desktop")
        input.search-input(
          type="text"
          placeholder="Quick search..."
          v-model="quickSearchQuery"
          @keyup.enter="performQuickSearch"
        )
        button.search-btn(@click="performQuickSearch")
          i.material-icons search
      
      // Network Status
      .network-status
        .status-indicator(:class="{ online: isOnline }")
        .status-text
          .block-height {{ latestBlock.height ? num.prettyInt(latestBlock.height) : '—' }}
          .status-label Latest Block
      
      // Mobile Menu Toggle
      .mobile-menu-toggle(v-if="!config.desktop" @click="toggleMobileMenu")
        i.material-icons(v-if="!mobileMenuOpen") menu
        i.material-icons(v-else) close

  // Mobile Navigation
  .mobile-nav(v-if="!config.desktop && mobileMenuOpen")
    .mobile-nav-content
      .mobile-search
        input.search-input(
          type="text"
          placeholder="Search transactions, blocks, addresses..."
          v-model="quickSearchQuery"
          @keyup.enter="performQuickSearch"
        )
        button.search-btn(@click="performQuickSearch")
          i.material-icons search
      
      .mobile-nav-links
        router-link.mobile-nav-link(to="/" exact-active-class="active" @click="closeMobileMenu")
          i.material-icons dashboard
          span Overview
        router-link.mobile-nav-link(to="/blocks" active-class="active" @click="closeMobileMenu")
          i.material-icons view_module
          span Blocks
        router-link.mobile-nav-link(to="/txs" active-class="active" @click="closeMobileMenu")
          i.material-icons receipt_long
          span Transactions
        router-link.mobile-nav-link(to="/contracts" active-class="active" @click="closeMobileMenu")
          i.material-icons code
          span Contracts
        router-link.mobile-nav-link(to="/tokens" active-class="active" @click="closeMobileMenu")
          i.material-icons toll
          span Tokens
        router-link.mobile-nav-link(to="/addresses" active-class="active" @click="closeMobileMenu")
          i.material-icons account_balance_wallet
          span Addresses
</template>

<script>
import { mapGetters } from "vuex";
import num from "../scripts/num";

export default {
  name: "modern-app-header",
  data() {
    return {
      quickSearchQuery: "",
      mobileMenuOpen: false,
      isOnline: true
    };
  },
  computed: {
    ...mapGetters(["config", "latestBlock", "bc"]),
    num() {
      return num;
    }
  },
  methods: {
    async performQuickSearch() {
      if (!this.quickSearchQuery.trim()) return;

      const query = this.quickSearchQuery.trim();
      this.quickSearchQuery = "";
      this.closeMobileMenu();

      await this.search(query);
    },

    async search(query) {
      if (!query) return;

      try {
        // 1) check as XNS name
        const address = await this.resolveXnsName(query);
        if (address) {
          this.$router.push({ name: "address", params: { address } });
          return;
        }

        // 2) if 64 hex, treat as tx or address
        if (/^[a-fA-F0-9]{64}$/.test(query)) {
          const txExists = await this.checkTxExists(query);
          if (txExists) {
            this.$router.push({ name: "tx", params: { hash: query } });
            return;
          }
          this.$router.push({ name: "address", params: { address: query } });
        } else if (/^\d+$/.test(query)) {
          // 3) numeric => block
          this.$router.push({ name: "block", params: { block: query } });
        } else {
          // 4) else check contract
          const contractExists = await this.checkContractExists(query);
          if (contractExists) {
            this.$router.push({ name: "contract", params: { contract: query } });
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

        const decoded = atob(data.result.response.value);
        const parsed = JSON.parse(decoded);
        return parsed.status !== 1 && parsed.result && parsed.result.replace(/'/g, "") !== "None" ? parsed.result.replace(/'/g, "") : null;
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
    },
    
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      
      // Prevent body scroll when mobile menu is open
      if (this.mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    },
    
    closeMobileMenu() {
      this.mobileMenuOpen = false;
      document.body.style.overflow = '';
    },
    
    watchWindowSize() {
      let w = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0
      );
      
      if (w >= 1024) {
        this.closeMobileMenu();
        this.$store.commit("SET_CONFIG_DESKTOP", true);
        return;
      }
      this.$store.commit("SET_CONFIG_DESKTOP", false);
    }
  },
  
  mounted() {
    this.watchWindowSize();
    window.onresize = this.watchWindowSize;
    
    // Check network status periodically
    setInterval(() => {
      this.isOnline = navigator.onLine;
    }, 5000);
  },
  
  beforeDestroy() {
    document.body.style.overflow = '';
  }
};
</script>

<style lang="stylus" scoped>
@import '../styles/modern-variables.styl'

.modern-header
  background var(--bg-card)
  border-bottom 1px solid var(--border-primary)
  backdrop-filter blur(10px)
  position sticky
  top 0
  z-index var(--z-sticky)
  box-shadow var(--shadow-sm)

.header-container
  max-width 1400px
  margin 0 auto
  padding 0 var(--space-6)
  display flex
  align-items center
  justify-content space-between
  height 72px
  
  @media (max-width: 1024px)
    padding 0 var(--space-4)

// Brand Section
.header-brand
  display flex
  align-items center

.brand-link
  display flex
  align-items center
  text-decoration none
  color var(--text-primary)
  transition all var(--transition-fast)
  
  &:hover
    transform translateY(-1px)

.brand-logo
  margin-right var(--space-3)
  
  img
    height 32px
    width auto

.brand-text
  display flex
  flex-direction column
  
  @media (max-width: 640px)
    display none

.brand-name
  font-size var(--text-lg)
  font-weight var(--font-bold)
  line-height 1.2

.brand-network
  font-size var(--text-xs)
  color var(--text-secondary)
  text-transform uppercase
  letter-spacing 0.05em
  font-weight var(--font-medium)
  margin-top 1px

// Navigation
.header-nav
  flex 1
  display flex
  justify-content center
  margin 0 var(--space-8)

.nav-links
  display flex
  align-items center
  gap var(--space-2)

.nav-link
  padding var(--space-3) var(--space-4)
  border-radius var(--radius-lg)
  text-decoration none
  color var(--text-secondary)
  font-family var(--font-primary)
  font-weight var(--font-medium)
  font-size var(--text-sm)
  transition all var(--transition-fast)
  position relative
  
  &:hover
    color var(--text-primary)
    background var(--bg-tertiary)
  
  &.active
    color var(--text-accent)
    background var(--bg-tertiary)
    
    &::after
      content ''
      position absolute
      bottom -1px
      left 50%
      transform translateX(-50%)
      width 20px
      height 2px
      background var(--primary-gradient)
      border-radius var(--radius-full)

// Header Actions
.header-actions
  display flex
  align-items center
  gap var(--space-4)

.quick-search
  display flex
  align-items center
  background var(--bg-tertiary)
  border-radius var(--radius-lg)
  padding var(--space-1)
  border 1px solid var(--border-primary)
  transition all var(--transition-fast)
  
  &:focus-within
    border-color var(--border-accent)
    box-shadow 0 0 0 3px rgba(0, 212, 255, 0.1)

.search-input
  background transparent
  border none
  padding var(--space-2) var(--space-3)
  color var(--text-primary)
  font-size var(--text-sm)
  width 200px
  
  &:focus
    outline none
  
  &::placeholder
    color var(--text-muted)
    
  @media (max-width: 1200px)
    width 150px

.search-btn
  background var(--primary-gradient)
  border none
  border-radius var(--radius-md)
  padding var(--space-2)
  color white
  cursor pointer
  display flex
  align-items center
  justify-content center
  transition all var(--transition-fast)
  
  &:hover
    transform scale(1.05)
    box-shadow var(--shadow-glow)
  
  i
    font-size 18px

.network-status
  display flex
  align-items center
  gap var(--space-2)
  padding var(--space-2) var(--space-3)
  background var(--bg-tertiary)
  border-radius var(--radius-lg)
  border 1px solid var(--border-primary)

.status-indicator
  width 8px
  height 8px
  border-radius 50%
  background var(--text-error)
  
  &.online
    background var(--text-success)
    box-shadow 0 0 8px rgba(74, 222, 128, 0.5)

.status-text
  display flex
  flex-direction column
  align-items flex-end
  
  @media (max-width: 768px)
    display none

.block-height
  font-size var(--text-sm)
  font-weight var(--font-medium)
  color var(--text-primary)
  line-height 1.2

.status-label
  font-size var(--text-xs)
  color var(--text-muted)
  text-transform uppercase
  letter-spacing 0.05em
  margin-top: 1px;

.mobile-menu-toggle
  display flex
  align-items center
  justify-content center
  width 40px
  height 40px
  border-radius var(--radius-lg)
  background var(--bg-tertiary)
  border 1px solid var(--border-primary)
  color var(--text-primary)
  cursor pointer
  transition all var(--transition-fast)
  
  &:hover
    background var(--bg-card-hover)
    border-color var(--border-accent)
  
  i
    font-size 20px

// Mobile Navigation
.mobile-nav
  position fixed
  top 72px
  left 0
  right 0
  bottom 0
  background var(--bg-overlay)
  backdrop-filter blur(10px)
  z-index 10000
  animation slideDown var(--transition-normal)

@keyframes slideDown
  from
    opacity 0
    transform translateY(-20px)
  to
    opacity 1
    transform translateY(0)

.mobile-nav-content
  background var(--bg-card)
  margin var(--space-4)
  border-radius var(--radius-xl)
  padding var(--space-6)
  box-shadow var(--shadow-xl)
  max-height calc(100vh - 120px)
  overflow-y auto

.mobile-search
  display flex
  gap var(--space-2)
  margin-bottom var(--space-6)
  
  .search-input
    flex 1
    background var(--bg-tertiary)
    border 1px solid var(--border-primary)
    border-radius var(--radius-lg)
    padding var(--space-3) var(--space-4)
    color var(--text-primary)
    
    &:focus
      outline none
      border-color var(--border-accent)
  
  .search-btn
    padding var(--space-3) var(--space-4)
    border-radius var(--radius-lg)

.mobile-nav-links
  display flex
  flex-direction column
  gap var(--space-2)

.mobile-nav-link
  display flex
  align-items center
  gap var(--space-3)
  padding var(--space-4)
  border-radius var(--radius-lg)
  text-decoration none
  color var(--text-secondary)
  font-weight var(--font-medium)
  transition all var(--transition-fast)
  
  &:hover
    color var(--text-primary)
    background var(--bg-tertiary)
  
  &.active
    color var(--text-accent)
    background var(--bg-tertiary)
    border-left 3px solid var(--text-accent)
  
  i
    font-size 20px
    width 24px
    text-align center
  
  span
    font-size var(--text-base)

// Responsive adjustments
@media (max-width: 1024px)
  .header-nav
    display none

@media (max-width: 640px)
  .header-container
    height 64px
  
  .quick-search
    display none
  
  .network-status
    padding var(--space-2)
    
    .status-text
      display none
</style>