import { setupKeyWatcher as setup } from './keyWatcher.js'
import { ConnectionError } from '../utils/Errors.js'

export { createNodeApi } from './api.js'

export const setupKeyWatcher = async ({ api, onUpdate }) => {
  await setup(api)({ onUpdate })
}

export const nodeHealthCheck = async (api, name = 'substrate') => {
  try {
    if (!(await api.isConnected)) throw new ConnectionError({ name })
    const [chain, runtime] = await Promise.all([api.runtimeChain, api.runtimeVersion])

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
}
