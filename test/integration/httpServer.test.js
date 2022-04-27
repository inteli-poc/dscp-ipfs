const { describe, before, it } = require('mocha')
const { expect } = require('chai')
const fetch = require('node-fetch')

const { PORT } = require('../../app/env')

describe('health checks', function () {
  const context = {}

  before(async function () {
    context.response = await fetch(`http://localhost:${PORT}/health`)
    context.body = await context.response.json()
    console.log(context)
  })

  it('should returns 200', function () {
    expect(context.response.status).to.equal(200)
  })

  it('and report contains IPFS status', function () {
    expect(context.body)
      .to.have.property('ipfs')
      .that.deep.equal({
        error: {
          message: 'Connection is not established, will retry during next polling cycle',
          service: 'ipfs',
        },
        status: 'error',
      })
  })

  it('also contains substrate node status', () => {
    expect(context.body)
      .to.have.property('substrate')
      .to.have.property('ipfs')
      .that.deep.equal({
        error: {
          message: 'Connection is not established, will retry during next polling cycle',
          service: 'substrate',
        },
        status: 'error',
      })
  })
})
