const {
  SUBSTRATE_STATUS_POLL_PERIOD_MS,
  SUBSTRATE_STATUS_TIMEOUT_MS
} = require('../env')

class ServiceWatcher {
  constructor(createNodeApi) {
    this.report = {}
    this.pollPeriod = SUBSTRATE_STATUS_POLL_PERIOD_MS
    this.timeout = SUBSTRATE_STATUS_TIMEOUT_MS
    this.createNodeApi = createNodeApi
  }

  // substrate polling function, each service should have their own
  async #substratePoll({ createNodeApi }) {
    try {
      const api = (await createNodeApi())._api
      if (!await api.isReady) throw new Error('service is not ready')
      const [chain, runtime] = await Promise.all([api.runtimeChain, api.runtimeVersion])
    
      return {
        name: 'substrate',
        status: 'up', // TODO repl with constant/symbol 
        detail: {
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
      return this.update('substrate', { status: 'error', error })
    }
  }
  
  delay(ms, result) {
    return new Promise(r => setTimeout(r, ms, result))
  }


  update(name, details) {
    if (!name) return null // some handling
    
    this.report = {
      ...this.report,
      [name]: details,
    }
  }

  // services that we would like to monitor should be added here
  // with [name] and [poll] properties, more can be added for enrichment
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
                [service.name]: {
                  status: 'down',
                  error: `timeout, not response for ${this.timeout}ms`,
                } // abstract to a helper method
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
    for await (const service of this.getStatus()) {
      const [[ name, details ]] = Object.entries(service)
      this.update(name, details)
    }
  }
}

module.exports = ServiceWatcher
