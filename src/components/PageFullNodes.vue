<template lang="pug">
tm-page(title='Full Nodes')
  // tm-tab-bar
    router-link(to="/nodes" exact) Connected Nodes ({{ online }})
    a(@click.prevent='toggleFilter'): i.material-icons(:class="{'mdi-rotate-180': asc}") filter_list
    a(@click='toggleSearch'): i.material-icons search
  tm-list-item(
    v-for="i in orderedFullNodes"
    :key="i.node_info.listen_addr"
    :title="getIp(i)"
    icon='storage'
    v-if="i.node_info"
  )
</template>

<script>
import { mapGetters } from "vuex"
import { TmListItem, TmPage, TmTabBar, TmToolBar } from "@tendermint/ui"

export default {
  name: "page-nodes",
  components: {
    TmListItem,
    TmPage,
    TmTabBar,
    TmToolBar
  },
  data() {
    return {
      asc: true,
      isLoading: true
    }
  },
  computed: {
    ...mapGetters(["nodes"]),
    orderedFullNodes() {
      if (this.nodes) {
        return this.nodes
      } else {
        return []
      }
    }
  },
  async created() {
    this.isLoading = true;
    try {
      await this.$store.dispatch('getNodes');
    } catch (error) {
      console.error("Failed to fetch nodes:", error);
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    toggleFilter() {
      this.asc = !this.asc
    },
    toggleSearch() {
      // Implement search toggle logic here
    },
    urlsafeIp(ip) {
      return ip ? ip.split(".").join("-") : "0.0.0.0"
    },
    getIp(fullNode) {
      return fullNode.remote_ip || "0.0.0.0"
    },
    getId(fullNode) {
      return fullNode.node_info.id || "Explorer Node"
    }
  }
}
</script>
