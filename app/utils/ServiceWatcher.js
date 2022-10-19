import { TimeoutError } from './Errors.js'
import env from '../env.js'

class ServiceWatcher {
  #pollPeriod
  #timeout

  // TODO add a method for updating this.services
  constructor(apis) {
    this.report = {}
    this.#pollPeriod = env.HEALTHCHECK_POLL_PERIOD_MS
    this.#timeout = env.HEALTHCHECK_TIMEOUT_MS
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

  // starts the generator resolving after the first update
  // use ServiceWatcher.gen.return() to stop
  async start() {
    if (this.services.length < 1) return null
    this.gen = this.#generator()

    const update = async (getAll = Promise.resolve([])) => {
      try {
        const services = await getAll
        services.forEach(({ name, ...rest }) => this.update(name, rest))
      } catch (error) {
        // if no service assume that this is server error e.g. TypeError, Parse...
        const name = error.service || 'server'
        this.update(name, { error, status: 'error' })
      }
    }

    const recursive = async () => {
      await this.delay(this.#pollPeriod)
      const { value } = this.gen.next()
      if (value) {
        await update(value)
        return recursive()
      }
    }

    const { value } = this.gen.next()
    await update(value)
    recursive()
  }

  // a generator function that returns poll fn for each service
  *#generator() {
    while (true)
      yield Promise.all(
        this.services.map((service) => Promise.race([service.poll(), this.delay(this.#timeout, service)]))
      )
  }
}

export default ServiceWatcher
