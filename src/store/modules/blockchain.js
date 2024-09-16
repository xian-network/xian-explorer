import axios from "axios"

const state = {
  rpc: "https://node.xian.org",
  status: {
    listen_addr: "",
    sync_info: {
      latest_block_height: 0,
      latest_block_hash: ""
    },
    node_info: {
      network: null,
      version: null,
      moniker: null,
    }
  },
  nodes: [],
  validators: [],
  consensusState: {},
  dumpConsensusState: {},
  blocks: [],
  transactions: [],
  roundStep: ""
}

const actions = {
  async getStatus({ commit }) {
    try {
      let json = await axios.get(`${state.rpc}/status`)
      let status = json.data.result
      commit("setStatus", status)
    } catch (error) {
      console.error("Error fetching status:", error)
    }
  },
  async getNodes({ commit }) {
    try {
      let json = await axios.get(`${state.rpc}/net_info`)
      let nodes = json.data.result.peers
      nodes = nodes.filter(node => node.node_info && node.node_info.moniker) // Filter invalid nodes
      commit("setNodes", nodes)
    } catch (error) {
      console.error("Error fetching nodes:", error)
    }
  },
  async getValidators({ commit, dispatch }) {
    try {
      let json = await axios.get(`${state.rpc}/validators`)
      commit("setValidators", json.data.result.validators)
      dispatch("updateValidatorAvatars")
    } catch (error) {
      console.error("Error fetching validators:", error)
    }
  },
  async getLastBlock({ commit }) {
    try {
      let json = await axios.get(`${state.rpc}/block`)
      commit("addBlock", json.data.result.block)
    } catch (error) {
      console.error("Error fetching last block:", error)
    }
  },
  async getConsensusState({ commit }) {
    try {
      let json = await axios.get(`${state.rpc}/consensus_state`)
      let consensusState = json.data.result.round_state
      commit("setConsensusState", consensusState)
    } catch (error) {
      console.error("Error fetching consensus state:", error)
    }
  },
  async getDumpConsensusState({ commit }) {
    try {
      let json = await axios.get(`${state.rpc}/dump_consensus_state`)
      commit("setDumpConsensusState", json.data.result)
    } catch (error) {
      console.error("Error fetching dump consensus state:", error)
    }
  },
  async updateValidatorAvatars({ state, commit }) {
    try {
      let promises = state.validators.map(async validator => {
        if (validator.description && validator.description.identity) {
          let urlPrefix = "https://keybase.io/_/api/1.0/user/lookup.json?key_suffix="
          let fullUrl = urlPrefix + validator.description.identity
          let json = await axios.get(fullUrl)
          if (json.data.status.name === "OK") {
            let user = json.data.them[0]
            if (user.pictures && user.pictures.primary) {
              commit("setValidatorAvatar", {
                validatorOwner: validator.owner,
                avatarUrl: user.pictures.primary.url
              })
            }
          }
        }
      })
      await Promise.all(promises)
    } catch (error) {
      console.error("Error updating validator avatars:", error)
    }
  }
}

const mutations = {
  setUrl(state, value) {
    state.rpc = value
  },
  setStatus(state, value) {
    state.status = value
  },
  setValidators(state, value) {
    if (value) {
      let validators = value.map(v => {
        v.avatarUrl = "http://via.placeholder.com/94/191F24/FFFFFF?text=?"
        return v
      })
      state.validators = validators
    }
  },
  setNodes(state, value) {
    let nodes = value
    nodes.push(state.status)
    state.nodes = nodes
  },
  identifyValidator(state, { address, node_info }) {
    let validator = state.validators.find(v => v.address === address)
    if (validator) {
      validator.node_info = node_info
    }
  },
  setValidatorAvatar(state, { validatorOwner, avatarUrl }) {
    let validator = state.validators.find(v => v.owner === validatorOwner)
    if (validator) {
      validator.avatarUrl = avatarUrl
    }
  },
  setConsensusState(state, value) {
    state.consensusState = value
  },
  setDumpConsensusState(state, value) {
    state.dumpConsensusState = value
  },
  setProposer(state, address) {
    let proposer = state.validators.find(v => v.address === address)
    if (proposer) {
      proposer.isProposer = true
      state.validators.forEach(v => {
        if (v.address !== address) {
          v.isProposer = false
        }
      })
    }
  },
  addBlock(state, block) {
    state.blocks.unshift(block)
    const maxBlocks = 100
    if (state.blocks.length > maxBlocks) {
      state.blocks = state.blocks.slice(0, maxBlocks)
    }
  },
  setRoundStep(state, step) {
    state.roundStep = step
  }
}

export default {
  state,
  actions,
  mutations
}
