<template>
  <div class="modern-page-validators">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Validators</h1>
        <p class="page-description">
          Active validators securing the Xian blockchain. Browse validator monikers and addresses without exposing IP information.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <div class="content-container">
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
                :key="validator.address"
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
                    <span class="address-hash">{{ validator.address }}</span>
                    <router-link
                      class="details-link"
                      :to="{ name: 'validator', params: { validator: validator.owner } }"
                    >
                      View Details
                    </router-link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading validators...</p>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <i class="material-icons">how_to_reg</i>
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

export default {
  name: "modern-page-validators",
  data() {
    return {
      loading: true
    };
  },
  computed: {
    ...mapGetters(["validators"]),
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
    }
  },
  mounted() {
    if (!this.validators || !this.validators.length) {
      this.$store.dispatch("getValidators");
    }
  },
  methods: {
    getMoniker(validator) {
      return (validator.description && validator.description.moniker) || "Anonymous Validator";
    }
  }
};
</script>

<style scoped>
.modern-page-validators {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page-header {
  background: linear-gradient(135deg, #1b2735 0%, #090a0f 100%);
  padding: 3rem 1.5rem;
  color: #ffffff;
}

.header-content {
  max-width: 960px;
  margin: 0 auto;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.page-description {
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 640px;
  color: rgba(255, 255, 255, 0.8);
}

.main-content {
  flex: 1;
  padding: 3rem 1.5rem;
  background: var(--app-bg, #0f1724);
}

.content-container {
  max-width: 960px;
  margin: 0 auto;
}

.table-container {
  background: rgba(15, 23, 36, 0.6);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(15, 23, 36, 0.35);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table thead {
  background: rgba(15, 23, 36, 0.85);
}

.modern-table th {
  text-align: left;
  padding: 1rem 1.5rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.table-row {
  transition: background 0.2s ease;
}

.table-row:nth-child(even) {
  background: rgba(15, 23, 36, 0.35);
}

.table-row:hover {
  background: rgba(30, 41, 59, 0.55);
}

.validator-cell,
.address-cell {
  padding: 1.25rem 1.5rem;
  vertical-align: middle;
}

.validator-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.validator-moniker {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
}

.validator-status {
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.9);
}

.address-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.address-hash {
  font-family: "Roboto Mono", monospace;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  word-break: break-all;
}

.details-link {
  font-size: 0.85rem;
  color: #38bdf8;
  text-decoration: none;
  font-weight: 500;
}

.details-link:hover {
  text-decoration: underline;
}

.loading-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 1.5rem;
  color: rgba(255, 255, 255, 0.8);
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  animation: spin 1s linear infinite;
}

.empty-state i.material-icons {
  font-size: 2.5rem;
  color: rgba(148, 163, 184, 0.9);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 2.5rem 1.25rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .main-content {
    padding: 2.5rem 1.25rem;
  }

  .validator-cell,
  .address-cell {
    padding: 1rem 1.25rem;
  }
}
</style>
