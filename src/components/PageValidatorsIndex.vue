<template lang="pug">
tm-page(title='Validators')
  tm-list-item(
    v-if="orderedValidators.length > 0"
    v-for="v in orderedValidators"
    
    :key="v.owner"
    :title="getHexEncodedPublicKey(v.pub_key.value)"
    :subtitle="votingPower(v)"
    :icon="'check_circle'"
    )
  tm-list-item(v-else title="validators are loading...")
</template>

<script>
import { mapGetters } from "vuex"
import orderedValidators from "../scripts/orderedValidators"
import validatorTitle from "../scripts/validatorTitle"
import votingPower from "../scripts/votingPower"
import votingValidators from "../scripts/votingValidators"
import { TmListItem, TmPage } from "@tendermint/ui"

import {  decodeBase64 } from 'tweetnacl-util';

export default {
  name: "page-validators",
  components: {
    TmListItem,
    TmPage
  },
  computed: {
    ...mapGetters(["validators"]),
    votingValidators() {
      if (this.validators && this.validators.length > 1) {
        return this.validators.filter(v => !v.revoked)
      } else {
        return []
      }
    },
    orderedValidators() {
      return orderedValidators(votingValidators(this.validators))
    },
  },
  methods: {
    getHexEncodedPublicKey(publicKeyBase64) {
        console.log(publicKeyBase64);
        // Decode the Base64-encoded public key
        const publicKeyBytes = decodeBase64(publicKeyBase64);

      
          // Step 3: Convert the Uint8Array to a hex string
          const verifyKeyHex = this.encodeHex(publicKeyBytes);

          return verifyKeyHex;
        },
      encodeHex(byteArray) {
          return Array.from(byteArray)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
          }
  },
 
  data: () => ({
    validatorTitle: validatorTitle,
    votingPower: votingPower
  })
}
</script>
