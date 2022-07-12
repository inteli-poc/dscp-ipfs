const { buildApi } = require('@digicatapult/dscp-node')

const { NODE_HOST, NODE_PORT } = require('../env')

const createNodeApi = async () => {
  const { api, keyring } = buildApi({
    options: {
      apiHost: NODE_HOST,
      apiPort: NODE_PORT,
    },
  })

  await api.isReady

  return {
    _api: api,
    _keyring: keyring,
    isEventKeyUpdate: (event) => api.events.ipfsKey.UpdateKey.is(event),
    getCurrentKey: async () => await api.query.ipfsKey.key(),
    setupEventProcessor: (eventProcessor) => api.query.system.events(eventProcessor),
  }
}

module.exports = { createNodeApi }
