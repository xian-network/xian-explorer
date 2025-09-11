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
        
        .modern-table
          .table-header-row
            .table-cell.height-col Height
            .table-cell.time-col Time
            .table-cell.hash-col Last Commit Hash
          
          .table-row(v-for="block in blocks" :key="block.header.height")
            .table-cell.height-col
              router-link.block-link(:to="`/blocks/${block.header.height}`")
                .block-number {{ num.prettyInt(block.header.height) }}
            
            .table-cell.time-col
              .time-display
                .time-main {{ formatTime(block.header.time) }}
                .time-ago {{ getTimeAgo(block.header.time) }}
            
            .table-cell.hash-col
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
import { orderBy } from "lodash"

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
  min-height 100vh
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

.modern-table
  .table-header-row
    display grid
    grid-template-columns 120px 200px 1fr
    gap 1rem
    padding 1rem 1.5rem
    background var(--bg-table-header)
    border-bottom 1px solid var(--border-color)
    font-weight 600
    font-size 0.85rem
    text-transform uppercase
    letter-spacing 0.5px
    color var(--text-secondary)
    
    @media (max-width: 768px)
      grid-template-columns 100px 150px 1fr
      gap 0.5rem
      padding 1rem

  .table-row
    display grid
    grid-template-columns 120px 200px 1fr
    gap 1rem
    padding 1rem 1.5rem
    border-bottom 1px solid var(--border-color)
    transition all 0.2s ease
    
    @media (max-width: 768px)
      grid-template-columns 100px 150px 1fr
      gap 0.5rem
      padding 1rem
    
    &:hover
      background var(--bg-hover)
    
    &:last-child
      border-bottom none

.table-cell
  display flex
  align-items center
  
  &.height-col
    justify-content flex-start
  
  &.time-col
    justify-content flex-start
  
  &.hash-col
    justify-content flex-start
    min-width 0

.block-link
  text-decoration none
  color var(--primary)
  font-weight 600
  font-size 1rem
  transition color 0.2s ease
  
  &:hover
    color var(--primary-light)
    text-decoration underline

.block-number
  font-family var(--font-mono)

.time-display
  .time-main
    font-size 0.9rem
    color var(--text-primary)
    margin-bottom 0.25rem
  
  .time-ago
    font-size 0.75rem
    color var(--text-dim)

.hash-display
  display flex
  align-items center
  gap 0.5rem
  min-width 0
  
  .hash-text
    font-family var(--font-mono)
    font-size 0.85rem
    color var(--text-primary)
    overflow hidden
    text-overflow ellipsis
    white-space nowrap
    flex 1
    
    @media (max-width: 768px)
      font-size 0.75rem
  
  .copy-btn
    background none
    border none
    color var(--text-dim)
    cursor pointer
    padding 0.25rem
    border-radius var(--border-radius)
    transition all 0.2s ease
    flex-shrink 0
    
    &:hover
      color var(--primary)
      background var(--bg-hover)
    
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