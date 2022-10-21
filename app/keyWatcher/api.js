import { buildApi } from '@digicatapult/dscp-node'

import env from '../env.js'

export const createNodeApi = async () => {
  const { api, keyring } = buildApi({
    options: {
      apiHost: env.NODE_HOST,
      apiPort: env.NODE_PORT,
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
