const { TimeoutError } = require('./Errors')
const { HEALTHCHECK_POLL_PERIOD_MS, HEALTHCHECK_TIMEOUT_MS } = require('../env')

class ServiceWatcher {
  #pollPeriod
  #timeout

  // TODO add a method for updating this.services
  constructor(apis) {
    this.report = {}
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

  // organize services and store in this.services
  #init(services) {
    return Object.keys(services)
      .map((service) => {
        const { healthCheck, ...api } = services[service]
        return healthCheck
          ? {
              name: service,
              poll: () => healthCheck(api),
            }
          : null
      })
      .filter(Boolean)
  }

  // fire and forget, cancel using ServiceWatcher.gen.return()
  // or ServiceWatcher.gen.throw(<instance of error>)
  start() {
    if (this.services.length < 1) return null
    this.gen = this.#generator()

    const recursive = async (getAll = Promise.resolve([])) => {
      try {
        const services = await getAll
        services.forEach(({ name, ...rest }) => this.update(name, rest))
        await this.delay(this.#pollPeriod)
      } catch (error) {
        // if no service assume that this is server error e.g. TypeError, Parse...
        const name = error.service || 'server'
        this.update(name, { error, status: 'error' })
      }

      const { value } = this.gen.next()
      if (value) return recursive(value)
    }

    const { value } = this.gen.next()
    recursive(value)
  }

  // a generator function that returns poll fn for each service
  *#generator() {
    while (true)
      yield Promise.all(
        this.services.map((service) => Promise.race([service.poll(), this.delay(this.#timeout, service)]))
      )
  }
}

module.exports = ServiceWatcher
