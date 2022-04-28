const { TimeoutError } = require('./Errors')
const { HEALTHCHECK_POLL_PERIOD_MS, HEALTHCHECK_TIMEOUT_MS } = require('../env')

class ServiceWatcher {
  #pollPeriod
  #timeout

  // TODO add a method for adding a sertvice once 
  // this has been initialized already
  constructor(apis) {
    this.report = {}
    this.stopped = false
    this.#pollPeriod = HEALTHCHECK_POLL_PERIOD_MS
    this.#timeout = HEALTHCHECK_TIMEOUT_MS
    this.services = this.#init(apis)
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

  #init(services) {
    return Object.keys(services)
      .map((service) => {
        const { healthCheck, ...api } = services[service]
        return healthCheck
          ? {
              name: service,
              poll: () => healthCheck(api, service),
            }
          : null
      })
      .filter(Boolean)
  }

  // main generator function with infinate loop
  #generator(self = this) {
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
    this.stopped = true
  }

  async start() {
    if (this.services.length < 1) return this.stop()
    this.gen = this.#generator()
    for await (const service of this.gen) {
      const { name, ...details } = service
      this.update(name, details)
      // TODO refactor this.stop() method
      if (this.stopped) break
    }
    return 'done'
  }
}

module.exports = ServiceWatcher
