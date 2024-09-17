<template lang="pug">
tm-part(:title="title")
  template(v-for="(x, i) in dataFields")
    part-tx-data(
      v-if="x.isComplex"
      :data="x.value"
      :name="namify(x.field)"
      :basePath="x.path"
      :pathPrefix="pathPrefix"
      :includeFields="includeFields"
      :excludeFields="excludeFields"
    )
    tm-list-item(
      v-else
      :dt="x.field"
    )
      template(slot="dd")
        a(v-if="x.isUrl" :href="x.value" target="_blank") {{ x.value }}
        router-link(v-else-if="x.isRouterLink" :to="x.value.to" :title="x.value.title")
          | {{ x.value.text }}
        span(v-else) {{ x.value }}
</template>

<script>
import { startCase, isNil, isObject, isString, isArray, sortBy } from 'lodash'
import { TmListItem, TmPart } from "@tendermint/ui"

export const isBase64str = (str) => {
  return isString(str) && str.indexOf(':base64:') === 0
}

export const base64strToHex = (b64str) => {
  b64str = b64str.replace(/^:base64:/, '')
  return Buffer.from(b64str, 'base64').toString('hex')
}

const isComplexValue = (x) => {
  return isObject(x) || isComplexArray(x)
}

const isComplexArray = (x) => {
  return isArray(x) && !isNil(x.find(isObject))
}

const isSimpleArray = (x) => {
  return isArray(x) && !isComplexArray(x)
}

const isUrlString = (x) => {
  return isString(x) && x.match(/^https?:\/\//)
}

export default {
  name: 'part-tx-data',

  components: {
    TmListItem,
    TmPart,
  },

  props: {
    data: { required: true },
    name: { type: String },
    basePath: { type: String },
    pathPrefix: { type: String, default: "" },
    includeFields: { type: Array, default: [] },
    excludeFields: { type: Array, default: [] }
  },
  data () {
    let { basePath, pathPrefix, name } = this
    return {
      title: basePath ? pathPrefix + basePath : name,
      hasBasePath: isString(this.basePath) && this.basePath.trim().length > 0
    }
  },
  computed: {
    dataFields () {
      let { data } = this
      if (isNil(data)) return []
      let res = Object.entries(data).map(([ field, v ]) => {
        let fieldPath = this.fieldPath(field)

        let cannotInclude = this.includeFields.length > 0 && !this.isIncludedField(fieldPath)
        if (cannotInclude || this.isExcludedField(fieldPath)) return null

        field = startCase(field)
        let isComplex = false
        let isRouterLink = false
        let isUrl = isUrlString(v)

        if (isNil(v)) {
          // Nothing
        } else if (isBase64str(v)) {
          v = base64strToHex(v)
        } else if (isSimpleArray(v)) {
          v = v.map(x => isString(x) ? `"${x}"` : x).join(', ')
        } else if (v.isRouterLink) {
          isRouterLink = true
        } else if (isComplexValue(v)) {
          isComplex = true
        }
        // We convert the YYYY-MM-DDTHH:MM:SSZ to a human readable format
        else if (field === 'Tx Timestamp') {
          let date = new Date(v)
          v = date.toLocaleString()
        }
        return { field, value: v, path: fieldPath, isComplex, isRouterLink, isUrl }
      }).filter(x => !isNil(x))
      let sorted = sortBy(res, x => x.isComplex)
      // Move Payload to the second position
      let payloadIndex = sorted.findIndex(x => x.field === 'Payload')
      if (payloadIndex > 0) {
        let payload = sorted.splice(payloadIndex, 2)[0]
        sorted.splice(2, 0, payload)
      }
      // move Tx Timestamp to Transaction Details
      let txTimestampIndex = sorted.findIndex(x => x.field === 'Tx Timestamp')
      if (txTimestampIndex > 0) {
        let txTimestamp = sorted.splice(txTimestampIndex, 1)[0]
        sorted.splice(1, 0, txTimestamp)
      }
      
      return sorted
    }
  },
  methods: {
    namify: startCase,
    fieldPath (fieldName) {
      let basePath = this.hasBasePath ? this.basePath + '.' : ''
      return `${basePath}${fieldName}`
    },
    isIncludedField (fieldPath) {
      return this.includeFields.indexOf(fieldPath) >= 0
    },
    isExcludedField (fieldPath) {
      return this.excludeFields.indexOf(fieldPath) >= 0
    }
  }
}
</script>
