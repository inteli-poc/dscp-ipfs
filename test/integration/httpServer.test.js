const { describe, before, it } = require('mocha')
const { expect } = require('chai')
const fetch = require('node-fetch')

const { PORT } = require('../../app/env')

describe('health checks', function () {
  const context = {}

  before(async function () {
    context.response = await fetch(`http://localhost:${PORT}/health`)
    context.body = await context.response.json()
  })

  describe('if any of the services status is down or error', () => {
    it('should return 503', function () {
      expect(context.response.status).to.equal(503)
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
        .that.deep.equal({
          status: 'up',
          details: {
            chain: 'Development',
            runtime: {
              name: 'dscp-node',
              versions: {
                authoring: 1,
                impl: 1,
                spec: 300,
                transaction: 1,
              },
            },
          },
        })
    })
  })
})
