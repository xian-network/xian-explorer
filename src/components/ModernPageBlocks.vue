<template lang="pug">
.modern-page-blocks
  .page-header
    .container
      .page-title
        h1 Blocks
        p Explore the latest blocks on the Xian blockchain
      
      .page-actions
        .pagination-controls(v-if="blocks.length > 0")
          router-link.btn.btn-secondary(:to="{ path: '/blocks', query: prevQuery }" v-if="hasPrevPage")
            i.material-icons chevron_left
            span Previous
          router-link.btn.btn-secondary(:to="{ path: '/blocks', query: nextQuery }" v-if="hasNextPage")
            span Next
            i.material-icons chevron_right
        
        a.btn.btn-outline(:href="jsonUrl" target="_blank" v-if="jsonUrl")
          i.material-icons code
          span JSON

  .page-content
    .container
      .blocks-table-container(v-if="blocks.length > 0")
        .table-header
          .table-info
            span Showing {{ blocks.length }} blocks
            span.range(v-if="minHeight && maxHeight") ({{ num.prettyInt(minHeight) }} - {{ num.prettyInt(maxHeight) }})
        
        .table-container
          table.modern-table
            thead
              tr
                th Height
                th Time
                th Last Commit Hash
            
            tbody
              tr.table-row(v-for="block in blocks" :key="block.header.height")
                td.height-cell
                  router-link.block-link(:to="`/blocks/${block.header.height}`")
                    .block-number {{ num.prettyInt(block.header.height) }}
                
                td.time-cell
                  .time-display
                    .time-main {{ formatTime(block.header.time) }}
                    .time-ago {{ getTimeAgo(block.header.time) }}
                
                td.hash-cell
                  .hash-display
                    .hash-text {{ block.header.last_commit_hash }}
                    button.copy-btn(@click="copyToClipboard(block.header.last_commit_hash)")
                      i.material-icons content_copy

      .loading-state(v-else-if="loading")
        .loading-spinner
        p Loading blocks...

      .empty-state(v-else)
        .empty-icon
          i.material-icons block
        h3 No blocks found
        p Unable to load blockchain data at this time.
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
      return new Date(timeString).toLocaleString()
    },
    getTimeAgo(timeString) {
      return moment(timeString).fromNow()
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

<style lang="stylus">
.modern-page-blocks
  background var(--bg-app)

.page-header
  background linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)
  padding 3rem 0 2rem
  border-bottom 1px solid var(--border-color)
  
  .container
    display flex
    justify-content space-between
    align-items flex-end
    gap 2rem
    
    @media (max-width: 768px)
      flex-direction column
      align-items flex-start
      gap 1.5rem

.page-title
  h1
    font-size 2.5rem
    font-weight 700
    color var(--text-primary)
    margin 0 0 0.5rem
    
    @media (max-width: 768px)
      font-size 2rem
  
  p
    font-size 1.1rem
    color var(--text-secondary)
    margin 0
    opacity 0.9

.page-actions
  display flex
  align-items center
  gap 1rem
  
  @media (max-width: 768px)
    width 100%
    justify-content space-between

.pagination-controls
  display flex
  gap 0.5rem

.page-content
  padding 2rem 0

.blocks-table-container
  background var(--bg-card)
  border-radius var(--border-radius-lg)
  border 1px solid var(--border-color)
  overflow hidden
  box-shadow var(--shadow-card)

.table-header
  padding 1.5rem
  border-bottom 1px solid var(--border-color)
  background var(--bg-card-header)
  
  .table-info
    display flex
    align-items center
    gap 1rem
    font-size 0.9rem
    color var(--text-secondary)
    
    .range
      color var(--text-dim)

.table-container
  background rgba(255, 255, 255, 0.05)
  border-radius 12px
  overflow hidden
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

.time-cell
  width 200px

.hash-cell
  min-width 0

.block-link
  text-decoration none
  color #14b8a6
  font-weight 600
  font-size 1rem
  transition color 0.2s ease
  
  &:hover
    color #10b981
    text-decoration underline

.block-number
  font-family 'JetBrains Mono', monospace

.time-display
  display flex
  flex-direction column
  gap 0.25rem

  .time-main
    font-size 0.9rem
    color #ffffff
    font-weight 500
  
  .time-ago
    font-size 0.75rem
    color rgba(255, 255, 255, 0.5)

.hash-display
  display flex
  align-items center
  gap 0.5rem
  min-width 0
  
  .hash-text
    font-family 'JetBrains Mono', monospace
    font-size 0.85rem
    color #ffffff
    overflow hidden
    text-overflow ellipsis
    white-space nowrap
    flex 1
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .copy-btn
    background none
    border none
    color rgba(255, 255, 255, 0.5)
    cursor pointer
    padding 0.25rem
    border-radius 4px
    transition all 0.2s ease
    flex-shrink 0
    
    &:hover
      color #14b8a6
      background rgba(255, 255, 255, 0.05)
    
    i
      font-size 1rem

.loading-state
  text-align center
  padding 4rem 2rem
  color var(--text-secondary)
  
  .loading-spinner
    width 40px
    height 40px
    border 3px solid var(--border-color)
    border-top 3px solid var(--primary)
    border-radius 50%
    animation spin 1s linear infinite
    margin 0 auto 1rem
  
  p
    margin 0
    font-size 1.1rem

.empty-state
  text-align center
  padding 4rem 2rem
  color var(--text-secondary)
  
  .empty-icon
    margin-bottom 1rem
    
    i
      font-size 3rem
      color var(--text-dim)
  
  h3
    margin 0 0 0.5rem
    color var(--text-primary)
  
  p
    margin 0
    font-size 1rem

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)
</style>