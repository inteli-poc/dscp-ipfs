export class TimeoutError extends Error {
  constructor(service) {
    super()
    this.type = this.constructor.name
    this.service = service.name
    this.message = 'Timeout error, no response from a service'
  }
}

export class ConnectionError extends Error {
  constructor(service) {
    super()
    this.service = service.name
    this.message = 'Connection is not established, will retry during next polling cycle'
  }
}
