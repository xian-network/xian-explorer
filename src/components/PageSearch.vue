<template lang="pug">
  tm-page(title='Search')
    tm-part(title='Search')
      tm-form-struct(@submit.native.prevent="onSubmit")
        tm-form-group
          .tm-modal-search
            tm-field#search-input(
              type="text"
              placeholder="Search for Name, Block, Transaction, Contract, or Address"
              required
              v-model="query"
            )
            tm-btn(type="submit" icon="search" :disabled="loading" value="Go")
</template>

<script>
import { mapGetters } from "vuex";
import { TmListItem, TmFormGroup, TmFormStruct, TmPage, TmPart, TmBtn, TmField } from "@tendermint/ui";

export default {
  name: "page-search",
  components: { TmBtn, TmField, TmFormGroup, TmFormStruct, TmListItem, TmPage, TmPart },
  computed: { ...mapGetters(["bc"]) },
  data: () => ({ query: "", loading: false }),
  methods: {
    async onSubmit(event) {
      if (event) event.preventDefault();
      this.loading = true;
      await this.search();
      this.loading = false;
    },
    
    async search() {
      if (!this.query) return;
      const trimmedQuery = this.query.trim();
      
      try {
        // Try resolving as an XNS name first
        const address = await this.resolveXnsName(trimmedQuery);
        if (address && address !== "None") {
          this.$router.push({ name: "address", params: { address } });
          return;
        }
        
        if (/^[a-fA-F0-9]{64}$/.test(trimmedQuery)) {
          const txExists = await this.checkTxExists(trimmedQuery);
          if (txExists) {
            this.$router.push({ name: "tx", params: { hash: trimmedQuery } });
            return;
          }
          this.$router.push({ name: "address", params: { address: trimmedQuery } });
        }
        
        else if (/^\d+$/.test(trimmedQuery)) {
          this.$router.push({ name: "block", params: { block: trimmedQuery } });
        } else {
          const contractExists = await this.checkContractExists(trimmedQuery);
          if (contractExists) {
            this.$router.push({ name: "contract", params: { contract: trimmedQuery } });
          } else {
            alert("No matching transaction, address, or contract found.");
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    },

    async resolveXnsName(name) {
      try {
        const payload = {
          sender: "",
          contract: "con_name_service_final",
          function: "get_main_name_to_address", 
          kwargs: { name },
        };
        
        const bytes = new TextEncoder().encode(JSON.stringify(payload));
        const hex = Array.from(bytes).map(x => ("00" + x.toString(16)).slice(-2)).join("");
        const response = await fetch(`${this.bc.rpc}/abci_query?path="/simulate_tx/${hex}"`);
        const data = await response.json();
        
        if (!data.result || !data.result.response || !data.result.response.value) {
          return null;
        }
        
        let decoded = atob(data.result.response.value);
        const parsed = JSON.parse(decoded);
        return parsed.status !== 1 && parsed.result && parsed.result.replace(/'/g, "") !== "None" ? parsed.result.replace(/'/g, "") : null;
      } catch (err) {
        console.error("XNS resolution error:", err);
        return null;
      }
    },

    async checkTxExists(txHash) {
      try {
        console.log("Checking tx:", txHash);
        const response = await fetch(`${this.bc.rpc}/tx?hash=0x${txHash}`);
        const data = await response.json();
        console.log(data);
        return data.result && data.result.tx_result;
      } catch (err) {
        console.error("Transaction lookup error:", err);
        return false;
      }
    },

    async checkContractExists(contractName) {
      try {
        const response = await fetch(`${this.bc.rpc}/abci_query?path="/contract/${contractName}"`);
        const data = await response.json();
        return data.result && data.result.response && data.result.response.value != null;
      } catch (err) {
        console.error("Contract lookup error:", err);
        return false;
      }
    }
  }
};
</script>

<style lang="stylus">
.tm-modal-search
  display: flex
  flex: 1
  .tm-field
    width: auto
    flex: 1
  .tm-btn
    margin-left: 0.5rem

.loading-spinner
  margin-left: 10px
  color: gray
</style>