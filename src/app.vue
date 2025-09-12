<template lang="pug">
modern-app
</template>

<script>
import { mapGetters } from "vuex"
import { TmModalError } from "@tendermint/ui"
import ModernApp from "./components/ModernApp"
import store from "./store/index"

export default {
  name: "app",
  components: {
    ModernApp,
    TmModalError
  },
  computed: {
    ...mapGetters(["nodes"])
  },
  mounted() {
    this.$store.dispatch("getLastBlock")
    this.$store.dispatch("subNewBlock")
    this.$store.dispatch("subRoundStep")
    this.$store.dispatch("getStatus")
    this.$store.dispatch("getNodes")
    this.$store.dispatch("getValidators")
    this.loadFaviconFromAssetsFolder()
    this.initializeModernTheme()
  },
  methods: {
    loadFaviconFromAssetsFolder() {
      let favicon = document.querySelector("link[rel*='icon']")
      if (!favicon) {
        favicon = document.createElement("link")
        favicon.rel = "icon"
        favicon.type = "image/png"
        favicon.href = require("@/assets/images/logo.png")
        document.head.appendChild(favicon)
      } else {
        favicon.href = require("@/assets/images/logo.png")
      }
    },
    
    initializeModernTheme() {
      // Set up modern theme variables and responsive behavior
      this.watchWindowSize()
      window.addEventListener('resize', this.watchWindowSize)
    },
    
    watchWindowSize() {
      let w = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0
      )
      
      if (w >= 1024) {
        this.$store.commit("SET_CONFIG_DESKTOP", true)
        return
      }
      this.$store.commit("SET_CONFIG_DESKTOP", false)
    }
  },
  store
}
</script>

<style lang="stylus" src="./styles/app.styl"></style>
<style lang="stylus">
  .tm-part
    max-width 100%
  .tm-part-main
   padding-right 0
  .tm-part-title
    font-size 14px
  .tm-page-header-text
    h2
      font-weight normal
  .tm-li-dl
    height 100%
    padding 0.5rem
  .tm-li-dt
    color var(--dim)
  .tm-li-dd
    white-space normal
    overflow auto
    word-break break-word
  @media screen and (min-width: 768px)
    .tm-part-container:last-child
      padding-bottom: 0
</style>
