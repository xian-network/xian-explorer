import Vue from "vue"
import Router from "vue-router"

Vue.use(Router)

import Index from "../components/ModernPageIndex"
import Search from "../components/PageSearch"
import Blocks from "../components/ModernPageBlocks"
import Transactions from "../components/ModernPageTxs"
import ModernPageBlock from "../components/ModernPageBlock"
import ModernPageTx from "../components/ModernPageTx"
import FullNodes from "../components/PageFullNodes"
import FullNode from "../components/PageFullNode"
import ModernPageValidators from "../components/ModernPageValidators"
import PageValidatorsRevoked from "../components/PageValidatorsRevoked"
import PageValidator from "../components/PageValidator"
import PageContracts from "../components/ModernPageContracts"
import ModernPageContract from "../components/ModernPageContract"
import ModernPageAddresses from "../components/ModernPageAddresses"
import ModernPageAddress from "../components/ModernPageAddress"
import ModernPageTokens from "../components/ModernPageTokens"
import ModernPageToken from "../components/ModernPageToken"

const routes = [
  { path: "/", component: Index },
  { path: "/search", component: Search },
  { path: "/blocks", component: Blocks },
  { path: "/blocks/:block", name: "block", component: ModernPageBlock },
  { path: "/tx/:hash", name: "tx", component: ModernPageTx }, // TODO rename path to /txs
  { path: "/txs", component: Transactions },
  { path: "/contracts", component: PageContracts },
  { path: "/contracts/:contract", name: "contract", component: ModernPageContract },
  { path: "/tokens", component: ModernPageTokens },
  { path: "/tokens/:contract", name: "token", component: ModernPageToken },
  { path: "/nodes", component: FullNodes },
  { path: "/addresses", component: ModernPageAddresses },
  { path: "/addresses/:address", name:"address", component: ModernPageAddress },
  {
    name: "node",
    path: "/nodes/:node",
    component: FullNode
  },

  // VALIDATORS
  { path: "/validators", name: "validators", component: ModernPageValidators },
  { path: "/validators/:validator", name: "validator", component: PageValidator },

  // REVOKED
  {
    path: "/validators-revoked",
    name: "validators-revoked",
    component: PageValidatorsRevoked
  }
]

export default new Router({
  mode: "history",
  routes: routes,
  scrollBehavior(to) {
    if (to.hash && to.hash.length > 0) {
      return {
        selector: to.hash
      }
    }
    return { x: 0, y: 0 }
  }
})
