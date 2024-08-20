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
            pattern=".{1,64}"
            title="1 to 64 characters")
          tm-btn(type="submit" icon="search" value="Go")

  tm-part(title='Sample Queries')
    //tm-list-item(dt='Address' dd='3HNSiAq7wFDaPsYDcUxNSRMD78qVcYKicw' @click.native="fillField('3HNSiAq7wFDaPsYDcUxNSRMD78qVcYKicw')")
    tm-list-item(dt='Transaction Hash' dd='A99B90549116C1F11C3FB5E04D4C4454DB4A99533FB9DD23EC4C57F47EBAEF3D' @click.native="fillField('A99B90549116C1F11C3FB5E04D4C4454DB4A99533FB9DD23EC4C57F47EBAEF3D')")
    tm-list-item(dt='Block #' dd='1337' @click.native="fillField('1337')")
    tm-list-item(dt='Contract' dd='currency' @click.native="fillField('currency')")
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
      if(this.query.length === 64) {
        this.$router.push({ name: "tx", params: { hash: this.query } })
      } else{
        if (parseInt(this.query)) {
          this.$router.push({ name: "block", params: { block: this.query } })
        } else {
          this.$router.push({ name: "contract", params: { contract: this.query } })
        }
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
