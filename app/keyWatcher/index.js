const { createNodeApi } = require('./api')
const { setupKeyWatcher } = require('./keyWatcher')
const { ConnectionError } = require('../utils/Errors')

module.exports = {
  setupKeyWatcher: async ({ onUpdate }) => {
    const api = await createNodeApi()
    await setupKeyWatcher(api)({ onUpdate })
    return api
  },
  nodeHealthCheck: async (api, name = 'substrate') => {
    try {
      if (!(await api._isConnected)) throw new ConnectionError({ name })
      const [chain, runtime] = await Promise.all([api._runtimeChain, api._runtimeVersion])

      return {
        name,
        status: 'up',
        details: {
          chain,
          runtime: {
            name: runtime.specName,
            versions: {
              spec: runtime.specVersion.toNumber(),
              impl: runtime.implVersion.toNumber(),
              authoring: runtime.authoringVersion.toNumber(),
              transaction: runtime.transactionVersion.toNumber(),
            },
          },
        },
      }
    } catch (error) {
      return { name, status: 'error', error }
    }
  },
}
