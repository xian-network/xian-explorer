<template lang="pug">
tm-page(title='Search')
  tm-part(title='Search')
    tm-form-struct(:submit="search")
      tm-form-group
        .tm-modal-search
          tm-field#search-input(
            type="text"
            placeholder="Search for Block Number, Transaction Hash, or Contracts"
            required
            v-model="query"
            )
          tm-btn(type="submit" icon="search" value="Go")

  tm-part(title='Sample Queries')
   
    tm-list-item(dt='Transaction Hash' dd='tx:A99B90549116C1F11C3FB5E04D4C4454DB4A99533FB9DD23EC4C57F47EBAEF3D' @click.native="fillField('tx:A99B90549116C1F11C3FB5E04D4C4454DB4A99533FB9DD23EC4C57F47EBAEF3D')")
    tm-list-item(dt='Block #' dd='block:1337' @click.native="fillField('block:1337')")
    tm-list-item(dt='Contract' dd='contract:currency' @click.native="fillField('contract:currency')")
    tm-list-item(dt='Address' dd='address:3b5623b7c38669d5c191036355cf56aa55590d89bab95d5722335f6572fbc3be' @click.native="fillField('address:3b5623b7c38669d5c191036355cf56aa55590d89bab95d5722335f6572fbc3be')")
</template>

<script>
import { mapGetters } from "vuex"
import {
  TmListItem,
  TmFormGroup,
  TmFormStruct,
  TmPage,
  TmPart,
  TmBtn,
  TmField
} from "@tendermint/ui"
export default {
  name: "page-search",
  components: {
    TmBtn,
    TmField,
    TmFormGroup,
    TmFormStruct,
    TmListItem,
    TmPage,
    TmPart
  },
  computed: {
    ...mapGetters(["bc"])
  },
  data: () => ({
    query: ""
  }),
  methods: {
    fillField(value) {
      this.query = value
    },
    search() {
      if(this.query.startsWith("tx:")) {
        this.$router.push({ name: "tx", params: { hash: this.query.replace("tx:", "") } })
      } 
      if (this.query.startsWith("address:")) {
        this.$router.push({ name: "address", params: { address: this.query.replace("address:", "") } })
      }
      if (this.query.startsWith("block:")) {
          this.$router.push({ name: "block", params: { block: this.query.replace("block:", "") } })
      } 
      if (this.query.startsWith("contract:")) {
          this.$router.push({ name: "contract", params: { contract: this.query.replace("contract:", "") } })
      }
    }
  }
}
</script>
<style lang="stylus">
.tm-modal-search
  display: flex;
  flex: 1;
  .tm-field
    width: auto;
    flex: 1;
  .tm-btn
    margin-left: 0.5rem;
</style>
