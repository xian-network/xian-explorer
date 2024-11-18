<template lang="pug">
  tm-page(:title="`Address: ${this.$route.params.address}`")
    div(slot="menu"): tm-tool-bar

    div
      tm-part(title='Address Details')
        tm-list-item(dt="Address" :dd="this.$route.params.address")
        tm-list-item(dt="Balance" :dd="this.wallet.balance + ' XIAN'")

    div
      tm-part(title='Transactions')
        table.BlocksTable
          thead
            th Time
            th Transaction Hash
            th Contract
            th Function
            th Stamps Used
          tbody
            tr(v-for="tx in transactions" :key="tx.hash")
              td {{ tx.formattedTime }}
              td
                router-link(:to="`/tx/${tx.hash}`")
                  | {{ tx.hash }}
              td {{ tx.contract }}
              td {{ tx.function }}
              td {{ tx.stamps }}
        
        tm-form-group.pagination
          a.button(
            :class="{ disabled: page === 1 }"
            @click="prevPage"
            class="prev"
          ) Prev
          span Page {{ page }}
          a.button(
            :class="{ disabled: transactions.length < itemsPerPage }"
            @click="nextPage"
            class="next"
          ) Next
</template>

<script>
import { mapGetters } from "vuex";
import axios from "axios";
import { TmListItem, TmPage, TmPart, TmToolBar } from "@tendermint/ui";

export default {
  name: "page-address",
  components: {
    TmToolBar,
    TmListItem,
    TmPart,
    TmPage
  },
  data: () => ({
    jsonUrl: "",
    wallet: {
      balance: 0
    },
    transactions: [],
    page: 1,
    itemsPerPage: 10
  }),
  computed: {
    ...mapGetters([
      "blockchain"
    ])
  },
  methods: {
    async fetchTransactions() {
      const offset = (this.page - 1) * this.itemsPerPage;
      const query = `
        query MyQuery($address: String!, $offset: Int!) {
          allStateChanges(
            filter: {key: {includes: $address}}
            first: ${this.itemsPerPage}
            offset: $offset
            orderBy: CREATED_DESC
          ) {
            edges {
              node {
                transactionByTxHash{
                  blockTime
                  blockHeight
                  contract
                  stamps
                  success
                  function
                  hash
                }
              }
            }
          }
        }
      `;
      const variables = { address: this.$route.params.address, offset };
      const response = await axios.post(`${this.blockchain.rpc}/graphql`, { query, variables });
      
      // Map transactions and convert blockTime to local date format
      this.transactions = response.data.data.allStateChanges.edges.map(edge => ({
        ...edge.node.transactionByTxHash,
        formattedTime: new Date(Number(edge.node.transactionByTxHash.blockTime) / 1e6).toLocaleString()
      }));
    },
    async fetchAddress() {
      const query = `
        query MyQuery($address: String!) {
          allStates(filter: {and: {key: {startsWith: $address, notLike: "%:%:%"}}}) {
            edges {
              node {
                value
              }
            }
          }
        }
      `;
      const address = "currency.balances:" + this.$route.params.address;
      const response = await axios.post(`${this.blockchain.rpc}/graphql`, { query, variables: { address } });
      const balance = parseFloat(response.data.data.allStates.edges[0].node.value);
      this.wallet.balance = balance.toFixed(8);
    },
    nextPage() {
      if (this.transactions.length >= this.itemsPerPage) {
        this.page++;
        this.fetchTransactions();
      }
    },
    prevPage() {
      if (this.page > 1) {
        this.page--;
        this.fetchTransactions();
      }
    }
  },
  async mounted() {
    await this.fetchAddress();
    await this.fetchTransactions();
  }
};
</script>
<style lang="stylus">
.BlocksTable
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

<style>

pre {
  padding: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  white-space: pre-wrap;
}
.pagination {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
a.button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
a.button{
  cursor: pointer;
}
</style>
