const {
  SUBSTRATE_STATUS_POLL_PERIOD_MS,
  SUBSTRATE_STATUS_TIMEOUT_MS
} = require('../env')

class ServiceWatcher {
  // taking helper functions can be improved by taking an object
  // { name: <srv_name>, method: createNodeApi } and use in init()
  constructor(createNodeApi) {
    this.report = {}
    this.pollPeriod = SUBSTRATE_STATUS_POLL_PERIOD_MS
    this.timeout = SUBSTRATE_STATUS_TIMEOUT_MS
    this.createNodeApi = createNodeApi
  }

  // substrate polling function, each service should have their own
  async #substratePoll({ createNodeApi, name = 'substrate' }) {
    try {
      const api = (await createNodeApi())._api
      if (!await api.isReady) throw new Error('service is not ready')
      const [chain, runtime] = await Promise.all([api.runtimeChain, api.runtimeVersion])
    
      return {
        name,
        status: 'up', // TODO repl with constant/symbol 
        details: {
          chain,
          runtime: {
            name: runtime.specName,
            versions: {
              spec: runtime.specVersion, //.toNumber(), // tmp commenting out for stubbing
              impl: runtime.implVersion, //.toNumber(),
              authoring: runtime.authoringVersion, //.toNumber(),
              transaction: runtime.transactionVersion //.toNumber(),
            },
          },
        }
      } 
    } catch(error) {
      // TODO logging
      return { name, status: 'error', error }
    }
  }
  
  delay(ms, result) {
    return new Promise(r => setTimeout(r, ms, result))
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
    return [{
      name: 'substrate',
      poll: () => this.#substratePoll(this)
    }]
  }

  // main generator function with infinate loop
  getStatus() {
    return {
      [Symbol.asyncIterator]: async function*() {
        while(true) {
          for (const service of this.init()) {
            await this.delay(1000)
            yield Promise.race([
              service.poll(),
              this.delay(this.timeout, {
                name: service.name,
                status: 'down',
                error: new Error(`timeout, no response for ${this.timeout}ms`),
              }),
            ])
          }
          break
        }
      }.bind(this)
    }
  }

  // TODO methood for stopping (update while val)
  // . might want to stop after certain errors or...
  // something to do for later as it was not very straight forward due to scope

  async start() {
    const generator = this.getStatus()
    for await (const service of generator) {
      const { name, ...details } = service
      this.update(name, details)
    }
    return Promise.resolve('done')
  }
}

module.exports = ServiceWatcher
