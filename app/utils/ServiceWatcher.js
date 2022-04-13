const { SUBSTRATE_STATUS_POLL_PERIOD_MS, SUBSTRATE_STATUS_TIMEOUT_MS } = require('../env')

class ServiceWatcher {
  #pollPeriod
  #timeout
  #createNodeApi
  // taking helper functions can be improved by taking an object
  // { name: <srv_name>, method: createNodeApi } and use in init()
  constructor(createNodeApi) {
    this.report = {}
    this.#createNodeApi = createNodeApi
    this.#pollPeriod = SUBSTRATE_STATUS_POLL_PERIOD_MS
    this.#timeout = SUBSTRATE_STATUS_TIMEOUT_MS
  }

  // substrate polling function, each service should have their own
  async #substratePoll(createNodeApi, name = 'substrate') {
    try {
      const api = (await createNodeApi())._api
      if (!(await api.isReady)) throw new Error('service is not ready')
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
      // TODO logging
      return { name, status: 'error', error }
    }
  }

  delay(ms, result) {
    return new Promise((r) => setTimeout(r, ms, result))
  }

  update(name, details = 'unknown') {
    if (!name || typeof name !== 'string') return null // some handling

    this.report = {
      ...this.report,
      [name]: details,
    }
  }

  // services that we would like to monitor should be added here
  // with [name] and { poll, properties }, more can be added for enrichment
  init() {
    return [
      {
        name: 'substrate',
        poll: () => this.#substratePoll(this.#createNodeApi),
      },
    ]
  }

  // main generator function with infinate loop
  generator(self = this) {
    return {
      [Symbol.asyncIterator]: async function* () {
        while (true) {
          for (const service of self.init()) {
            await self.delay(self.#pollPeriod)
            yield Promise.race([
              service.poll(),
              self.delay(self.#timeout, {
                name: service.name,
                status: 'down',
                error: new Error(`timeout, no response for ${self.#timeout}ms`),
              }),
            ])
          }
          break
        }
      },
    }
  }

  // TODO methood for stopping (update while val)
  // . might want to stop after certain errors or...
  // something to do for later as it was not very straight forward due to scope
  async start() {
    const gen = this.generator()
    for await (const service of gen) {
      const { name, ...details } = service
      this.update(name, details)
    }
    return 'done'
  }
}

module.exports = ServiceWatcher
