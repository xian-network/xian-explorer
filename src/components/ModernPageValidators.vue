<template>
  <div class="modern-page-validators">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Validators</h1>
        <p class="page-description">
          Active validators securing the Xian blockchain.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="content-container">
        <!-- Table Controls -->
        <div class="table-controls" v-if="!loading && totalValidators">
          <div class="page-info">
            <span class="info-label">Active Validators</span>
            <span class="info-value">{{ totalValidators }}</span>
            <span v-if="totalPages > 1" class="range">Showing {{ pageRangeStart }} - {{ pageRangeEnd }}</span>
          </div>
          <div class="pagination-controls" v-if="totalPages > 1">
            <router-link
              v-if="hasPrevPage"
              :to="{ path: '/validators', query: prevQuery }"
              class="nav-button prev-button"
            >
              <i class="material-icons">chevron_left</i>
              Previous
            </router-link>
            <router-link
              v-if="hasNextPage"
              :to="{ path: '/validators', query: nextQuery }"
              class="nav-button next-button"
            >
              Next
              <i class="material-icons">chevron_right</i>
            </router-link>
          </div>
        </div>

        <!-- Validators Table -->
        <template v-if="!loading && totalValidators">
          <div class="table-container">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="validator in displayedValidators"
                  :key="validator.owner || validator.address"
                  class="table-row"
                >
                  <td class="address-cell">
                    <div class="address-wrapper">
                      <span class="validator-status">Active Validator</span>
                      <router-link
                        :to="`/addresses/${getDisplayAddress(validator)}`"
                        class="tx-link"
                      >
                        <div class="hash-text">{{ getDisplayAddress(validator) }}</div>
                      </router-link>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-controls bottom-controls" v-if="totalPages > 1">
            <div class="pagination-controls">
              <router-link
                v-if="hasPrevPage"
                :to="{ path: '/validators', query: prevQuery }"
                class="nav-button prev-button"
              >
                <i class="material-icons">chevron_left</i>
                Previous
              </router-link>
              <router-link
                v-if="hasNextPage"
                :to="{ path: '/validators', query: nextQuery }"
                class="nav-button next-button"
              >
                Next
                <i class="material-icons">chevron_right</i>
              </router-link>
            </div>
          </div>
        </template>

        <!-- Loading State -->
        <div v-else-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading validators...</p>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <i class="material-icons">how_to_reg</i>
          </div>
          <h3>No validators found</h3>
          <p>There are no validators to display at the moment.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import orderedValidators from "../scripts/orderedValidators";
import votingValidators from "../scripts/votingValidators";
import { decodeBase64 } from "tweetnacl-util";

export default {
  name: "modern-page-validators",
  data() {
    return {
      loading: true,
      itemsPerPage: 20,
      currentPage: 1,
      hasRequestedValidators: false
    };
  },
  computed: {
    ...mapGetters(["validators"]),
    activeValidators() {
      const list = votingValidators(this.validators || []);
      return orderedValidators(list);
    },
    totalValidators() {
      return this.activeValidators.length;
    },
    totalPages() {
      if (!this.totalValidators) {
        return 1;
      }
      return Math.max(1, Math.ceil(this.totalValidators / this.itemsPerPage));
    },
    hasPrevPage() {
      return this.totalValidators > 0 && this.currentPage > 1;
    },
    hasNextPage() {
      return this.totalValidators > 0 && this.currentPage < this.totalPages;
    },
    prevQuery() {
      if (!this.hasPrevPage) {
        return this.buildQueryForPage(1);
      }
      return this.buildQueryForPage(this.currentPage - 1);
    },
    nextQuery() {
      if (!this.hasNextPage) {
        return this.buildQueryForPage(this.totalPages);
      }
      return this.buildQueryForPage(this.currentPage + 1);
    },
    displayedValidators() {
      if (!this.totalValidators) {
        return [];
      }
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.activeValidators.slice(start, end);
    },
    pageRangeStart() {
      if (!this.totalValidators) {
        return 0;
      }
      return (this.currentPage - 1) * this.itemsPerPage + 1;
    },
    pageRangeEnd() {
      if (!this.totalValidators) {
        return 0;
      }
      return Math.min(this.pageRangeStart + this.itemsPerPage - 1, this.totalValidators);
    }
  },
  watch: {
    validators: {
      immediate: true,
      handler(newValue) {
        if (Array.isArray(newValue)) {
          const hasData = newValue.length > 0;
          if (!hasData && !this.hasRequestedValidators) {
            return;
          }
          this.loading = false;
          this.ensurePageWithinRange();
        }
      }
    },
    "$route.query.page": {
      immediate: true,
      handler() {
        this.syncPageFromRoute();
      }
    }
  },
  mounted() {
    if (!this.validators || !this.validators.length) {
      this.hasRequestedValidators = true;
      this.$store
        .dispatch("getValidators")
        .finally(() => {
          if (this.loading) {
            this.loading = false;
            this.ensurePageWithinRange();
          }
        });
    } else {
      this.loading = false;
      this.ensurePageWithinRange();
    }
  },
  methods: {
    buildQueryForPage(page) {
      const query = { ...this.$route.query };
      if (page <= 1) {
        delete query.page;
      } else {
        query.page = String(page);
      }
      return query;
    },
    replacePageInRoute(page) {
      const targetQuery = this.buildQueryForPage(page);
      const currentPageParam = this.$route.query.page;
      const targetPageParam = targetQuery.page;
      if (
        (currentPageParam || "") === (targetPageParam || "") &&
        Object.keys(targetQuery).length === Object.keys(this.$route.query).length
      ) {
        return;
      }
      this.$router.replace({ query: targetQuery });
    },
    parsePageValue(pageValue) {
      const parsed = Number.parseInt(pageValue, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return 1;
      }
      return parsed;
    },
    getNormalizedPage(pageNumber) {
      const totalPages = Math.max(1, this.totalPages);
      return Math.min(Math.max(pageNumber, 1), totalPages);
    },
    syncPageFromRoute() {
      const pageParam = this.$route.query.page;
      const parsed = this.parsePageValue(pageParam);
      const normalized = this.loading ? parsed : this.getNormalizedPage(parsed);
      if (this.currentPage !== normalized) {
        this.currentPage = normalized;
      }
      if (this.loading) {
        return;
      }
      const targetParam = normalized > 1 ? String(normalized) : undefined;
      if ((pageParam || undefined) !== targetParam) {
        this.replacePageInRoute(normalized);
      }
    },
    ensurePageWithinRange() {
      const normalized = this.getNormalizedPage(this.currentPage);
      if (normalized !== this.currentPage) {
        this.currentPage = normalized;
      }
      const pageParam = this.$route.query.page;
      const targetParam = normalized > 1 ? String(normalized) : undefined;
      if ((pageParam || undefined) !== targetParam) {
        this.replacePageInRoute(normalized);
      }
    },
    getDisplayAddress(validator) {
      if (!validator || !validator.pub_key || !validator.pub_key.value) {
        return "";
      }

      try {
        return this.encodeHex(decodeBase64(validator.pub_key.value));
      } catch (error) {
        return this.getRouteAddress(validator);
      }
    },
    getRouteAddress(validator) {
      if (!validator) {
        return "";
      }

      return validator.owner || validator.address || "";
    },
    encodeHex(byteArray) {
      return Array.from(byteArray)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    }
  }
};
</script>

<style lang="stylus" scoped>
.modern-page-validators
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

.bottom-controls
  margin-top 2rem

.page-info
  display flex
  align-items baseline
  gap 0.5rem
  font-size 0.95rem
  color rgba(255, 255, 255, 0.7)

  .info-label
    text-transform uppercase
    letter-spacing 0.08em
    font-size 0.75rem
    color rgba(255, 255, 255, 0.6)

  .info-value
    font-size 1.25rem
    font-weight 600
    color #14b8a6

  .range
    font-size 0.85rem
    color rgba(255, 255, 255, 0.6)

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


  
.tx-link
  text-decoration none
  color inherit
  
  &:hover .hash-text
    color #fff

.hash-text
  font-weight: 600;
  font-size: 1rem;
  color #00d4ff
  transition color 0.2s ease

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

.validator-status
  font-size 0.75rem
  text-transform uppercase
  letter-spacing 0.08em
  color rgba(255, 255, 255, 0.5)

.address-cell
  width 100%

.address-wrapper
  display flex
  flex-direction column
  gap 0.5rem
  align-items flex-start

.address-hash
  font-family 'Monaco', 'Menlo', 'Ubuntu Mono', monospace
  font-size 0.9rem
  color rgba(255, 255, 255, 0.85)
  word-break break-all

.details-link
  align-self flex-start
  display inline-flex
  align-items center
  gap 0.35rem
  padding 0.5rem 1rem
  background rgba(59, 130, 246, 0.12)
  border 1px solid rgba(59, 130, 246, 0.3)
  border-radius 999px
  color #3b82f6
  text-decoration none
  font-size 0.8rem
  font-weight 500
  letter-spacing 0.04em
  text-transform uppercase
  transition all 0.2s ease

  &:hover
    background rgba(59, 130, 246, 0.2)
    border-color rgba(59, 130, 246, 0.5)
    color #ffffff

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

// Responsive Design
@media (max-width: 768px)
  .page-header
    padding 2rem 0

  .header-content
    padding 0 1rem

  .page-title
    font-size 2rem

  .page-description
    font-size 1rem
    padding 0 1rem

  .content-container
    padding 0 1.5rem

  .table-controls
    flex-direction column
    align-items flex-start
    gap 0.75rem

  .page-info
    .info-label
      font-size 0.7rem
    .info-value
      font-size 1.1rem

  .modern-table
    thead th
      padding 1rem
      font-size 0.75rem
    tbody td
      padding 1rem

  .address-wrapper
    gap 0.35rem

  .details-link
    padding 0.4rem 0.85rem
    font-size 0.75rem
</style>
