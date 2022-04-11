const { createNodeApi } = require('../keyWatcher/api');
const {
  SUBSTRATE_STATUS_POLL_PERIOD_MS,
  SUBSTRATE_STATUS_TIMEOUT_MS
} = require('../env')

class ServiceWatcher {
  #delay(ms, result) {
    return new Promise(r => setTimeout(r, ms, result))
  }

  async #substrateStatus() {
    const api = (await createNodeApi())._api
    await api.isReady // wait for api to be ready
    const [chain, runtime] = await Promise.all([api.runtimeChain, api.runtimeVersion])
  
    return {
      name: 'substrate',
      status: 'status-up', // TODO repl with constant/symbol 
      detail: {
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
      }
    } 
  }

  constructor() {
    this.pollPeriod = SUBSTRATE_STATUS_POLL_PERIOD_MS
    this.timeout = SUBSTRATE_STATUS_TIMEOUT_MS
  }

  init() {
    // return initial state for all services
    return [this.#substrateStatus]
  }

  start(self = this) {
    return {
      [Symbol.asyncIterator]: async function*() {
        while(true) {
          for (const getStatus of self.init()) {
            await self.#delay(1000)
            yield Promise.race([
              getStatus(), 
              self.#delay(self.timeout, { status: 'status-down' }),
            ])
          }
        }
      }
    }
  }
}

// return a new instance of StatusWatcher
module.exports = new ServiceWatcher()
