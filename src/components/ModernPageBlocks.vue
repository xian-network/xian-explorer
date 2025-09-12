<template>
  <div class="modern-page-blocks">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Blocks</h1>
        <p class="page-description">
          Explore the latest blocks on the Xian blockchain. View block details, transactions, and timestamps.
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
              :to="{ path: '/blocks', query: prevQuery }" 
              class="nav-button prev-button"
            >
              <i class="material-icons">chevron_left</i>
              Previous
            </router-link>
            <router-link 
              v-if="hasNextPage"
              :to="{ path: '/blocks', query: nextQuery }" 
              class="nav-button next-button"
            >
              Next
              <i class="material-icons">chevron_right</i>
            </router-link>
          </div>
         
          <div class="json-link" v-if="jsonUrl">
            <a :href="jsonUrl" target="_blank" class="json-button">
              <i class="material-icons">code</i>
              JSON
            </a>
          </div>
        </div>

        <!-- Blocks Table -->
        <div class="table-container" v-if="blocks.length > 0">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Height</th>
                <th>Time</th>
                <th>Last Commit Hash</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="block in blocks" :key="block.header.height" class="table-row">
                <td class="height-cell">
                  <router-link :to="`/blocks/${block.header.height}`" class="block-link">
                    <div class="block-number">{{ num.prettyInt(block.header.height) }}</div>
                  </router-link>
                </td>
                
                <td class="time-cell">
                  <div class="time-display">
                    <div class="time-main">{{ formatTime(block.header.time) }}</div>
                    <div class="time-ago">{{ getTimeAgo(block.header.time) }}</div>
                  </div>
                </td>
                
                <td class="hash-cell">
                  <div class="hash-display">
                    <div class="hash-text">{{ block.header.last_commit_hash }}</div>
                    
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading blocks...</p>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <i class="material-icons">block</i>
          </div>
          <h3>No blocks found</h3>
          <p>Unable to load blockchain data at this time.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios"
import moment from "moment"
import num from "../scripts/num"


import { mapGetters } from "vuex"
import { readableDate } from "../scripts/utils"

// Tendermint REST RPC doesn't return more than 20 blocks per request.
const maxItemsPerPage = 20

export default {
  name: "modern-page-blocks",
  data() {
    return {
      moment: moment,
      num: num,
      jsonUrl: "",
      itemsPerPage: maxItemsPerPage,
      minHeight: 0,
      maxHeight: 0,
      blocks: [],
      loading: true
    }
  },
  computed: {
    ...mapGetters([
      "blockchain",
      "totalBlocks",
    ]),
    hasPrevPage() {
      return this.totalBlocks > 0 && this.minHeight > 1
    },
    hasNextPage() {
      return this.totalBlocks > 0 && this.maxHeight < this.totalBlocks
    },
    prevQuery() {
      if (!this.hasPrevPage) return {}

      let { itemsPerPage, minHeight, maxHeight } = this
      return {
        minHeight: minHeight - itemsPerPage,
        maxHeight: maxHeight - itemsPerPage
      }
    },
    nextQuery() {
      if (!this.hasNextPage) return {}

      let { itemsPerPage, minHeight, maxHeight } = this
      return {
        minHeight: minHeight + itemsPerPage,
        maxHeight: maxHeight + itemsPerPage
      }
    },
  },
  methods: {
    readableDate,
    formatTime(timeString) {
      // Parse UTC timestamp and format for display
      return moment.utc(timeString).local().format('MMM D, YYYY [at] h:mm A')
    },
    getTimeAgo(timeString) {
      return moment.utc(timeString).fromNow()
    },
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    },
    async fetchPageOfBlocks() {
      this.loading = true
      try {
        let { totalBlocks, itemsPerPage } = this

        let { minHeight, maxHeight } = this.$route.query
        if (minHeight) minHeight = parseInt(minHeight)
        if (maxHeight) maxHeight = parseInt(maxHeight)

        if (totalBlocks > 0 && (!maxHeight || maxHeight < 1 || maxHeight > totalBlocks)) {
          maxHeight = totalBlocks
        }
        if (!minHeight && maxHeight) {
          minHeight = maxHeight - itemsPerPage + 1
        }
        if (minHeight < 1) {
          minHeight = 1
        }

        let query = (minHeight || maxHeight) ? `?minHeight=${minHeight}&maxHeight=${maxHeight}` : ''
        this.jsonUrl = `${this.blockchain.rpc}/blockchain${query}`
        let json = await axios.get(this.jsonUrl)
        this.blocks = json.data.result.block_metas

        minHeight = 0
        maxHeight = 0
        this.blocks.forEach(block => {
          let height = parseInt(block.header.height)
          if (height < minHeight || !minHeight) minHeight = height
          if (height > maxHeight || !maxHeight) maxHeight = height
        })
        this.minHeight = minHeight
        this.maxHeight = maxHeight
      } catch (error) {
        console.error('Error fetching blocks:', error)
        this.blocks = []
      } finally {
        this.loading = false
      }
    },
  },
  async mounted() {
    await this.fetchPageOfBlocks()
  },
  watch: {
    '$route'() {
      this.fetchPageOfBlocks()
    }
  }
}
</script>

<style lang="stylus" scoped>
.modern-page-blocks
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
  gap 0.5rem

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

.page-info
  color rgba(255, 255, 255, 0.7)
  font-size 0.9rem
  
  .range
    margin-left 0.5rem
    opacity 0.8

.json-link
  .json-button
    display flex
    align-items center
    gap 0.5rem
    padding 0.75rem 1.5rem
    background rgba(59, 130, 246, 0.1)
    border 1px solid rgba(59, 130, 246, 0.3)
    border-radius 8px
    color #3b82f6
    text-decoration none
    font-weight 500
    transition all 0.2s ease
    
    &:hover
      background rgba(59, 130, 246, 0.2)
      border-color rgba(59, 130, 246, 0.5)
      transform translateY(-1px)

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

.height-cell
  width 120px

.block-link
  text-decoration none
  color #00d4ff
  
  &:hover .block-number
    color #fff

.block-number
  font-size 1rem
  font-weight 600
  color #00d4ff
  transition color 0.2s ease

.time-cell
  width 200px

.time-display
  .time-main
    font-size 0.95rem
    color #ffffff
    font-weight 500
    margin-bottom 0.25rem
  
  .time-ago
    font-size 0.8rem
    color rgba(255, 255, 255, 0.6)

.hash-cell
  .hash-display
    display flex
    align-items center
    gap 1rem
    
    .hash-text
      font-family 'Monaco', 'Menlo', 'Ubuntu Mono', monospace
      font-size 0.85rem
      color rgba(255, 255, 255, 0.8)
      word-break break-all
      flex 1
    
    .copy-btn
      background rgba(255, 255, 255, 0.1)
      border 1px solid rgba(255, 255, 255, 0.2)
      border-radius 6px
      padding 0.5rem
      color rgba(255, 255, 255, 0.7)
      cursor pointer
      transition all 0.2s ease
      
      &:hover
        background rgba(255, 255, 255, 0.2)
        color #ffffff
        transform scale(1.05)
      
      i
        font-size 1rem

.loading-state
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  color rgba(255, 255, 255, 0.7)
  
  .loading-spinner
    width 40px
    height 40px
    border 3px solid rgba(255, 255, 255, 0.1)
    border-top 3px solid #14b8a6
    border-radius 50%
    animation spin 1s linear infinite
    margin-bottom 1rem
  
  p
    font-size 1.1rem
    margin 0

.empty-state
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 4rem 2rem
  color rgba(255, 255, 255, 0.7)
  text-align center
  
  .empty-icon
    margin-bottom 1.5rem
    
    i
      font-size 3rem
      color rgba(255, 255, 255, 0.3)
  
  h3
    font-size 1.5rem
    color #ffffff
    margin 0 0 0.5rem 0
  
  p
    font-size 1rem
    margin 0
    opacity 0.8

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)
</style>