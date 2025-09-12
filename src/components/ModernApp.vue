<template lang="pug">
#modern-app
  // Modern Header
  modern-app-header
  
  // Main Content Area
  main.main-content
    router-view
  
  // Footer (optional)
  footer.modern-footer(v-if="showFooter")
    .footer-container
      .footer-content
        .footer-section
          .footer-title About Xian Explorer
          p.footer-text
            | Explore the Xian blockchain with ease.
            | View transactions, blocks, contracts, and more with real-time data.
        
        .footer-section
          .footer-title Quick Links
          .footer-links
            router-link(to="/") Overview
            router-link(to="/blocks") Blocks
            router-link(to="/txs") Transactions
            router-link(to="/contracts") Contracts
            router-link(to="/tokens") Tokens
            router-link(to="/addresses") Addresses
        
        .footer-section
          .footer-title Network Info
          .footer-info
            .info-item
              span Chain ID: 
              strong {{ latestBlock.chain_id || 'xian-1' }}
            .info-item
              span Latest Block: 
              strong {{ latestBlock.height ? num.prettyInt(latestBlock.height) : '—' }}
            .info-item
              span Network: 
              strong Mainnet
        
        .footer-section
          .footer-title Resources
          .footer-links
            a(href="https://xian.org" target="_blank" rel="noopener") Official Website
            a(href="https://docs.xian.org" target="_blank" rel="noopener") Documentation
            a(href="https://github.com/xian-network" target="_blank" rel="noopener") GitHub
            a(href="https://t.me/xian_network" target="_blank" rel="noopener") Telegram
      
      .footer-bottom
        .footer-copyright
          | © Xian
        .footer-meta
          .footer-version Explorer v2.0
          .footer-status
            .status-indicator.online
            span Network Online
</template>

<script>
import ModernAppHeader from "./ModernAppHeader.vue";
import { mapGetters } from "vuex";
import num from "../scripts/num";

export default {
  name: "modern-app",
  components: {
    ModernAppHeader
  },
  data() {
    return {
      showFooter: true
    };
  },
  computed: {
    ...mapGetters(["latestBlock"]),
    num() {
      return num;
    }
  },
  mounted() {
    // Initialize modern theme
    document.body.classList.add('modern-theme');
    
    // Set up global styles
    this.setupGlobalStyles();
  },
  methods: {
    setupGlobalStyles() {
      // Add any global style setup here
      const root = document.documentElement;
      
      // Ensure smooth scrolling
      root.style.scrollBehavior = 'smooth';
    }
  }
};
</script>

<style lang="stylus">
@import '../styles/modern-variables.styl'

// Global styles for modern theme
html, body
  margin 0
  padding 0
  font-family var(--font-primary)
  background var(--bg-primary)
  color var(--text-primary)
  line-height 1.6
  height auto
  overflow-x hidden
  overflow-y auto

*
  box-sizing border-box

// Modern app container
#modern-app
  min-height 100vh
  display flex
  flex-direction column
  background var(--bg-primary)
  overflow visible

// Main content area
.main-content
  flex 1
  width 100%
  

// Modern Footer
.modern-footer
  background var(--bg-secondary)
  border-top 1px solid var(--border-primary)
  margin-top auto

.footer-container
  max-width 1400px
  margin 0 auto
  padding var(--space-12) var(--space-6) var(--space-6)
  
  @media (max-width: 768px)
    padding var(--space-8) var(--space-4) var(--space-4)

.footer-content
  display grid
  grid-template-columns repeat(auto-fit, minmax(250px, 1fr))
  gap var(--space-8)
  margin-bottom var(--space-8)
  
  @media (max-width: 768px)
    grid-template-columns 1fr
    gap var(--space-6)
    margin-bottom var(--space-6)

.footer-section
  .footer-title
    font-size var(--text-lg)
    font-weight var(--font-semibold)
    color var(--text-primary)
    margin-bottom var(--space-4)
  
  .footer-text
    color var(--text-secondary)
    font-size var(--text-sm)
    line-height 1.6

.footer-links
  display flex
  flex-direction column
  gap var(--space-2)
  
  a
    color var(--text-secondary)
    text-decoration none
    font-size var(--text-sm)
    transition color var(--transition-fast)
    
    &:hover
      color var(--text-accent)

.footer-info
  .info-item
    display flex
    align-items center
    margin-bottom var(--space-2)
    font-size var(--text-sm)
    color var(--text-secondary)
    
    strong
      color var(--text-primary)
      margin-left var(--space-1)

.footer-social
  display flex
  gap var(--space-3)
  
  a
    display flex
    align-items center
    justify-content center
    width 40px
    height 40px
    background var(--bg-tertiary)
    border-radius var(--radius-lg)
    color var(--text-secondary)
    text-decoration none
    transition all var(--transition-fast)
    
    &:hover
      background var(--bg-card-hover)
      color var(--text-accent)
      transform translateY(-2px)
    
    i
      font-size 20px

.footer-bottom
  display flex
  justify-content space-between
  align-items center
  padding-top var(--space-6)
  border-top 1px solid var(--border-primary)
  
  @media (max-width: 768px)
    flex-direction column
    gap var(--space-3)
    text-align center

.footer-copyright
  color var(--text-muted)
  font-size var(--text-sm)

.footer-meta
  display flex
  align-items center
  gap var(--space-4)
  
  @media (max-width: 768px)
    flex-direction column
    gap var(--space-2)

.footer-version
  color var(--text-muted)
  font-size var(--text-sm)
  font-family var(--font-mono)

.footer-status
  display flex
  align-items center
  gap var(--space-2)
  font-size var(--text-sm)
  color var(--text-secondary)

.status-indicator
  width 8px
  height 8px
  border-radius 50%
  
  &.online
    background var(--color-success)
    box-shadow 0 0 8px rgba(34, 197, 94, 0.4)
  
  &.offline
    background var(--color-error)

// Global utility classes
.container
  max-width 1400px
  margin 0 auto
  padding 0 var(--space-6)
  
  @media (max-width: 768px)
    padding 0 var(--space-4)

.page-container
  padding var(--space-8) 0
  
  @media (max-width: 768px)
    padding var(--space-6) 0

.page-header
  text-align center
  margin-bottom var(--space-12)
  
  .page-title
    font-size var(--text-4xl)
    font-weight var(--font-bold)
    margin-bottom var(--space-4)
    
    @media (max-width: 768px)
      font-size var(--text-3xl)
  
  .page-subtitle
    font-size var(--text-lg)
    color var(--text-secondary)
    max-width 600px
    margin 0 auto

// Scrollbar styling
::-webkit-scrollbar
  width 8px
  height 8px

::-webkit-scrollbar-track
  background var(--bg-secondary)

::-webkit-scrollbar-thumb
  background var(--border-secondary)
  border-radius var(--radius-full)
  
  &:hover
    background var(--border-accent)

// Selection styling
::selection
  background rgba(0, 212, 255, 0.3)
  color var(--text-primary)

// Focus styles
*:focus
  outline 2px solid var(--text-accent)
  outline-offset 2px

// Loading animations
@keyframes pulse
  0%, 100%
    opacity 1
  50%
    opacity 0.5

@keyframes fadeIn
  from
    opacity 0
    transform translateY(20px)
  to
    opacity 1
    transform translateY(0)

.fade-in
  animation fadeIn 0.5s ease-out

.pulse
  animation pulse 2s infinite

// Print styles
@media print
  .modern-header, .modern-footer
    display none
  
  .main-content
    min-height auto
    padding 0
  
  * 
    background white !important
    color black !important
    box-shadow none !important
</style>