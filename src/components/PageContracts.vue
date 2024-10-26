<template lang="pug">
tm-page(title='Contracts')
  div(slot="menu"): tm-tool-bar
    router-link(:to="{ path: '/contracts', query: prevQuery }" v-if="hasPrevPage")
      i.material-icons chevron_left
      | Prev. Contracts
    router-link(:to="{ path: '/contracts', query: nextQuery }" v-if="hasNextPage")
      | Next Contracts
      i.material-icons chevron_right
    a(:href="jsonUrl" target="_blank") JSON

  table.ContractsTable
    thead
      th Contract Name
      th Submission Date
    tbody
      tr(v-for="contract in contracts" :key="contract.name")
        td
          router-link(:to="`/contracts/${contract.name}`")
            | {{ contract.name }}
        td {{ contract.submissionDate }}
</template>

<script>
import axios from "axios";
import num from "../scripts/num";
import { mapGetters } from "vuex";
import { TmPage, TmToolBar } from "@tendermint/ui";

const maxItemsPerPage = 20;

export default {
  name: "page-contracts",
  components: {
    TmPage,
    TmToolBar
  },
  data() {
    return {
      contracts: [],
      jsonUrl: "",
      num: num,
      currentPage: 1,
      itemsPerPage: maxItemsPerPage,
      offset: 0,
    };
  },
 computed: {
  ...mapGetters([
    "blockchain",
  ]),
  hasPrevPage() {
    // Show "Prev" button only if the offset is greater than 0
    return this.offset > 0;
  },
  hasNextPage() {
    // Show "Next" button if the number of contracts equals the items per page (indicating there might be more)
    return this.contracts.length === this.itemsPerPage;
  },
  prevQuery() {
    // Calculate the previous offset, ensuring it doesn't go below 0
    const newOffset = Math.max(this.offset - this.itemsPerPage, 0);
    return {
      offset: newOffset,
    };
  },
  nextQuery() {
    // Increment the offset by the number of items per page
    const newOffset = this.offset + this.itemsPerPage;
    return {
      offset: newOffset,
    };
  },
},

methods: {
  async fetchContracts(offset = 0) {
  // Set the offset, ensuring it's a valid number
  this.offset = parseInt(offset, 10) || 0;

  // Construct the GraphQL query with the current offset, limit, and order
  const query = `
    query MyQuery {
      allContracts(offset: ${this.offset}, first: ${this.itemsPerPage}, orderBy: CREATED_DESC) {
        nodes {
          name
          created
        }
      }
    }
  `;

  try {
    // Fetch the contracts using the GraphQL endpoint
    const response = await axios.post(`${this.blockchain.rpc}/graphql`, {
      query: query
    });

    // Check if the response contains data
    const contractsData = (response.data && response.data.data && response.data.data.allContracts && response.data.data.allContracts.nodes) || [];

    // Update the contracts data
    this.contracts = contractsData.map(function(contract) {
      return {
        name: contract.name,
        // Convert blockTime to a date format if needed
        submissionDate: new Date(contract.created).toLocaleString(),
      };
    });
  } catch (error) {
    console.error("Error fetching contracts:", error);
  }
},

  handlePageChange(offset) {
    // Update the route with the new offset
    this.$router.push({ path: '/contracts', query: { offset } });
  },
},

watch: {
  '$route': {
    immediate: true,
    handler(newRoute) {
      // Parse the offset from the route, defaulting to 0 if not present
      let offset = newRoute.query.offset || 0;
      this.fetchContracts(offset);
    }
  }
},
}
</script>

<style lang="stylus">
.ContractsTable
  width 100%
  th
    color var(--dim)
    background var(--box-shadow)
    font-weight bold
    font-size 14px
  tr
    &:hover
      background-color var(--hover-bg)
  th, td
    padding 0.5rem 1rem
</style>
