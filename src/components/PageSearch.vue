<template lang="pug">
  tm-page(title='Search')
    tm-part(title='Search')
      tm-form-struct(:submit="search")
        tm-form-group
          .tm-modal-search
            tm-field#search-input(
              type="text"
              placeholder="Search for Block Number, Transaction Hash, Contracts, or xns:name"
              required
              v-model="query"
            )
            tm-btn(type="submit" icon="search" value="Go")
  
    tm-part(title='Sample Queries')
      tm-list-item(dt='Transaction Hash'
                   dd='tx:A99B90549116C1F11C3FB5E04D4C4454DB4A99533FB9DD23EC4C57F47EBAEF3D'
                   @click.native="fillField('tx:A99B90549116C1F11C3FB5E04D4C4454DB4A99533FB9DD23EC4C57F47EBAEF3D')")
      tm-list-item(dt='Block #'
                   dd='block:1337'
                   @click.native="fillField('block:1337')")
      tm-list-item(dt='Contract'
                   dd='contract:currency'
                   @click.native="fillField('contract:currency')")
      tm-list-item(dt='Address'
                   dd='address:3b5623b7c38669d5c191036355cf56aa55590d89bab95d5722335f6572fbc3be'
                   @click.native="fillField('address:3b5623b7c38669d5c191036355cf56aa55590d89bab95d5722335f6572fbc3be')")
      tm-list-item(dt='Name'
                   dd='xns:alice'
                   @click.native="fillField('xns:alice')")
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
  
  // -------------------------------------------------------------------------
  // If you already have this helper, remove or modify accordingly.
  function toHexString(bytes) {
    return Array.from(bytes)
      .map((x) => ("00" + x.toString(16)).slice(-2))
      .join("");
  }
  
  // -------------------------------------------------------------------------
  // Example: Reverse Name Service Lookup
  // "xns:name" -> "address"
  async function get_main_name_to_address(xnsName, rpc) {
    // Adjust the "function" field and contract name to match your actual contract
    const payload = {
      sender: "",
      contract: "con_name_service",
      function: "get_main_name_to_address", 
      kwargs: { name: xnsName },
    };
  
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const hex = toHexString(bytes);
  
    // Make the ABCI query call
    const response = await fetch(`${rpc}/abci_query?path="/simulate_tx/${hex}"`);
    const data = await response.json();
  
    // Decode the base64 response
    let decoded = "";
    if (data.result && data.result.response && data.result.response.value) {
      decoded = atob(data.result.response.value);
    }
  
    // If there's no real response, treat as None
    if (!decoded || decoded === "ée" || decoded === "AA==") {
      return "None";
    }
  
    let parsed;
    try {
      parsed = JSON.parse(decoded);
    } catch (err) {
      return "None";
    }
  
    // If status is 1 or invalid, treat as None
    if (parsed.status === 1) {
      return "None";
    }
  
    // The "result" field could have quotes
    // Example: "'3b5623b7c38669d5c191036355cf56aa55590d89bab95d5722335f6572fbc3be'"
    let address = parsed.result.replaceAll("'", "");
    return address;
  }
  
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
      ...mapGetters(["bc"])  // "bc" must have at least .rpc
    },
    data: () => ({
      query: ""
    }),
    methods: {
      fillField(value) {
        this.query = value
      },
  
      async search() {
        // XNS: check
        if (this.query.startsWith("xns:")) {
          const xnsName = this.query.replace("xns:", "");
          // 1) Reverse-lookup the address
          const address = await get_main_name_to_address(xnsName, this.bc.rpc);
  
          if (address === "None") {
            // Could show an error, or do something else:
            alert(`No address found for xns:${xnsName}`);
            return;
          }
  
          // 2) Route to the "address" page with the resolved address
          this.$router.push({ name: "address", params: { address } });
          return;
        }
  
        // Original checks:
        if (this.query.startsWith("tx:")) {
          this.$router.push({ 
            name: "tx",
            params: { hash: this.query.replace("tx:", "") }
          });
        } 
        else if (this.query.startsWith("address:")) {
          this.$router.push({ 
            name: "address",
            params: { address: this.query.replace("address:", "") }
          });
        }
        else if (this.query.startsWith("block:")) {
          this.$router.push({
            name: "block",
            params: { block: this.query.replace("block:", "") }
          });
        } 
        else if (this.query.startsWith("contract:")) {
          this.$router.push({
            name: "contract",
            params: { contract: this.query.replace("contract:", "") }
          });
        }
        // If none match, do nothing or handle otherwise
      }
    }
  }
  </script>
  
  <style lang="stylus">
  .tm-modal-search
    display: flex
    flex 1
    .tm-field
      width auto
      flex 1
    .tm-btn
      margin-left 0.5rem
  </style>
  