const { ConnectionError, TimeoutError } = require('./Errors')
const { SUBSTRATE_STATUS_POLL_PERIOD_MS, SUBSTRATE_STATUS_TIMEOUT_MS } = require('../env')

class ServiceWatcher {
  #pollPeriod
  #timeout

  constructor(apis) {
    this.report = {}
    this.stopped = false
    this.#pollPeriod = SUBSTRATE_STATUS_POLL_PERIOD_MS
    this.#timeout = SUBSTRATE_STATUS_TIMEOUT_MS
    this.services = this.#init(apis)
  }

  async ipfs(api, name = 'ipfs') {
    try {
      if (!api || !api.pid) throw new ConnectionError({ name })
      const { spawnfile, pid, killed } = api

      return {
        name,
        status: 'up',
        details: {
          spawnfile,
          pid,
          killed,
        },
      }
    } catch (error) {
      return { name, status: 'error', error }
    }
  }

  // substrate polling function, each service should have their own
  async substrate(api, name = 'substrate') {
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
      // TODO logging and/or any other handling
      return { name, status: 'error', error }
    }
  }

  delay(ms, service = false) {
    return new Promise((resolve, reject) => {
      setTimeout(() => (service ? reject(new TimeoutError(service)) : resolve()), ms)
    })
  }

  update(name, details = 'unknown') {
    if (!name || typeof name !== 'string') return null // some handling
    if (this.report[name] === details) return null // no need to update

    this.report = {
      ...this.report,
      [name]: details,
    }
  }

  // services that we would like to monitor should be added here
  // with [name] and { poll, properties }, more can be added for enrichment
  #init(services) {
    return Object.keys(services)
      .map((service) => {
        if (!this[service]) {
          // TODO log that there are no polling functions for this service
          return null
        }
        return {
          name: service,
          poll: () => this[service](services[service]),
        }
      })
      .filter(Boolean)
  }

  // main generator function with infinate loop
  generator(self = this) {
    this.stopped = false
    return {
      [Symbol.asyncIterator]: async function* () {
        try {
          while (true) {
            await self.delay(self.#pollPeriod)
            for (const service of self.services) {
              yield Promise.race([service.poll(), self.delay(self.#timeout, service)])
            }
          }
        } catch (error) {
          yield {
            status: 'down',
            name: error.service,
            error,
          }
        }
      },
    }
  }

  stop() {
    // TODO return log.info and return an error
    // take some args for error types
    this.stopped = true
  }

  // TODO methood for stopping (update while val)
  async start() {
    if (this.services.length < 1) return this.stop()
    this.gen = this.generator()
    for await (const service of this.gen) {
      const { name, ...details } = service
      this.update(name, details)
      if (this.stopped) break // TODO return log.info('watcher has stopped')
    }
    return 'done'
  }
}

module.exports = ServiceWatcher
