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
        <div class="table-controls" v-if="!loading && activeValidators.length">
          <div class="page-info">
            <span class="info-label">Active Validators</span>
            <span class="info-value">{{ activeValidators.length }}</span>
          </div>
        </div>

        <!-- Validators Table -->
        <div class="table-container" v-if="!loading && activeValidators.length">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Moniker</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="validator in activeValidators"
                :key="validator.owner || validator.address"
                class="table-row"
              >
                <td class="validator-cell">
                  <div class="validator-info">
                    <span class="validator-moniker">{{ getMoniker(validator) }}</span>
                    <span class="validator-status">Active Validator</span>
                  </div>
                </td>
                <td class="address-cell">
                  <div class="address-wrapper">
                     <router-link :to="`/addresses/${getDisplayAddress(validator)}`" class="tx-link">
                      <div class="hash-text">{{ (getDisplayAddress(validator)) }}</div>
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
import axios from "axios";
import { mapGetters } from "vuex";
import orderedValidators from "../scripts/orderedValidators";
import votingValidators from "../scripts/votingValidators";
import { decodeBase64 } from "tweetnacl-util";

export default {
  name: "modern-page-validators",
  data() {
    return {
      loading: true,
      monikerMap: {},
      monikerFetchInFlight: false,
      monikerRpcSource: ""
    };
  },
  computed: {
    ...mapGetters(["validators", "blockchain"]),
    rpcEndpoint() {
      const blockchainState = this.blockchain || {};
      const rpc = blockchainState.rpc || "https://node.xian.org";
      return rpc.replace(/\/$/, "");
    },
    activeValidators() {
      const list = votingValidators(this.validators || []);
      return orderedValidators(list);
    }
  },
  watch: {
    validators: {
      immediate: true,
      handler(newValue) {
        if (Array.isArray(newValue)) {
          this.loading = false;
        }
      }
    },
    "blockchain.rpc": {
      immediate: true,
      handler(newValue, oldValue) {
        if (!newValue || newValue === oldValue) {
          return;
        }
        this.fetchValidatorMonikers();
      }
    }
  },
  mounted() {
    if (!this.validators || !this.validators.length) {
      this.$store.dispatch("getValidators");
    }
    this.fetchValidatorMonikers();
  },
  methods: {
    async fetchValidatorMonikers() {
      const rpcEndpoint = this.rpcEndpoint;
      if (!rpcEndpoint) {
        return;
      }

      if (this.monikerFetchInFlight) {
        return;
      }

      if (this.monikerRpcSource === rpcEndpoint && Object.keys(this.monikerMap).length) {
        return;
      }

      this.monikerFetchInFlight = true;
      try {
        const { data } = await axios.get(`${rpcEndpoint}/net_info`);
        const peers = (data && data.result && data.result.peers) || [];
        const map = {};
        const subtle = this.getSubtleCrypto();

        const tasks = peers.map(async peer => {
          const nodeInfo = peer && peer.node_info;
          const moniker = nodeInfo && nodeInfo.moniker;
          if (!moniker) {
            return;
          }

          const nodeId = nodeInfo && nodeInfo.id;
          const remoteIp = peer && peer.remote_ip;

          this.addMonikerKey(map, nodeId, moniker);
          this.addMonikerKey(map, remoteIp, moniker);

          if (subtle && nodeId) {
            try {
              const hashed = await this.hashHexId(subtle, nodeId);
              this.addMonikerKey(map, hashed, moniker);
            } catch (error) {
              console.error("Failed to hash node ID", error);
            }
          }
        });

        await Promise.all(tasks);
        this.monikerMap = map;
        this.monikerRpcSource = rpcEndpoint;
      } catch (error) {
        console.error("Failed to fetch validator monikers:", error);
      } finally {
        this.monikerFetchInFlight = false;
      }
    },
    addMonikerKey(target, key, moniker) {
      if (!key) {
        return;
      }
      target[String(key).toUpperCase()] = moniker;
    },
    getSubtleCrypto() {
      if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
        return window.crypto.subtle;
      }
      if (typeof self !== "undefined" && self.crypto && self.crypto.subtle) {
        return self.crypto.subtle;
      }
      return null;
    },
    async hashHexId(subtle, hexId) {
      const normalized = (hexId || "").replace(/[^0-9a-fA-F]/g, "");
      if (!normalized) {
        return null;
      }

      const bytePairs = normalized.match(/.{1,2}/g) || [];
      const bytes = new Uint8Array(bytePairs.map(pair => parseInt(pair, 16)));
      const digestBuffer = await subtle.digest("SHA-256", bytes);
      const digestArray = Array.from(new Uint8Array(digestBuffer));
      return digestArray
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 40)
        .toUpperCase();
    },
    getValidatorMonikerCandidates(validator) {
      const candidates = new Set();
      if (!validator) {
        return [];
      }

      const pushCandidate = value => {
        if (value) {
          candidates.add(String(value).toUpperCase());
        }
      };

      pushCandidate(validator.address);
      pushCandidate(validator.node_id);
      pushCandidate(validator.nodeId);
      pushCandidate(validator.operator_address);
      pushCandidate(validator.owner);
      pushCandidate(validator.consensus_address);
      pushCandidate(validator.moniker);
      pushCandidate(validator.remote_ip);

      if (validator.node_info && validator.node_info.id) {
        pushCandidate(validator.node_info.id);
      }

      try {
        const displayAddress = this.getDisplayAddress(validator);
        if (displayAddress) {
          pushCandidate(displayAddress.slice(0, 40));
          pushCandidate(displayAddress);
        }
      } catch (error) {
        // ignore errors during address decoding
      }

      return Array.from(candidates);
    },
    getMoniker(validator) {
      if (!validator) {
        return "Anonymous Validator";
      }

      const candidates = this.getValidatorMonikerCandidates(validator);
      for (const candidate of candidates) {
        if (candidate && this.monikerMap[candidate]) {
          return this.monikerMap[candidate];
        }
      }

      if (validator.description) {
        if (typeof validator.description === "string") {
          try {
            const parsed = JSON.parse(validator.description);
            if (parsed && parsed.moniker) {
              return parsed.moniker;
            }
          } catch (error) {
            // ignore parsing errors and continue with other fallbacks
          }
        } else if (validator.description.moniker) {
          return validator.description.moniker;
        }
      }

      if (validator.moniker) {
        return validator.moniker;
      }

      if (validator.description_moniker) {
        return validator.description_moniker;
      }

      return "Anonymous Validator";
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

.validator-cell
  width 320px

.validator-info
  display flex
  flex-direction column
  gap 0.35rem

.validator-moniker
  font-size 1rem
  font-weight 600
  color #ffffff

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

  .validator-cell
    width auto

  .address-wrapper
    gap 0.35rem

  .details-link
    padding 0.4rem 0.85rem
    font-size 0.75rem
</style>
