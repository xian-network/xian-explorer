import Vue from "vue"
import Router from "vue-router"

Vue.use(Router)

import Index from "../components/ModernPageIndex"
import Search from "../components/PageSearch"
import Blocks from "../components/ModernPageBlocks"
import Transactions from "../components/ModernPageTxs"
import Block from "../components/PageBlock"
import ModernPageBlock from "../components/ModernPageBlock"
import Tx from "../components/PageTx"
import ModernPageTx from "../components/ModernPageTx"
import FullNodes from "../components/PageFullNodes"
import FullNode from "../components/PageFullNode"
import PageValidators from "../components/PageValidators"
import PageValidatorsIndex from "../components/PageValidatorsIndex"
import PageValidatorsRevoked from "../components/PageValidatorsRevoked"
import PageValidator from "../components/PageValidator"
import PageContracts from "../components/ModernPageContracts"
import PageContract from "../components/PageContract"
import ModernPageContract from "../components/ModernPageContract"
import PageRichlist from "../components/PageRichlist"
import ModernPageAddresses from "../components/ModernPageAddresses"
import PageAddress from "../components/PageAddress"
import PageTokens from "../components/PageTokens"
import ModernPageTokens from "../components/ModernPageTokens"
import PageToken from "../components/PageToken"

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
  { path: "/tokens/:token", name: "token", component: PageToken },
  { path: "/nodes", component: FullNodes },
  { path: "/addresses", component: ModernPageAddresses },
  { path: "/addresses/:address", name:"address", component: PageAddress },
  {
    name: "node",
    path: "/nodes/:node",
    component: FullNode
  },

  // VALIDATORS
  {
    path: "/validators",
    component: PageValidators,
    children: [
      {
        path: "/",
        name: "validators",
        component: PageValidatorsIndex
      },
      {
        path: ":validator",
        name: "validator",
        component: PageValidator
      }
    ]
  },

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
  scrollBehavior(to, from) {
    if (to.hash && to.hash.length > 0) {
      return {
        selector: to.hash
      }
    }
    return { x: 0, y: 0 }
  }
})
