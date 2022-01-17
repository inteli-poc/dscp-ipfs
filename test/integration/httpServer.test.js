const { describe, before, it } = require('mocha')
const { expect } = require('chai')
const fetch = require('node-fetch')

const { PORT } = require('../../app/env')

describe('health', function () {
  const context = {}

  before(async function () {
    context.response = await fetch(`http://localhost:${PORT}/health`)
    context.body = await context.response.json()
  })

  it('should return 200', function () {
    expect(context.response.status).to.equal(200)
  })

  it('should return success', function () {
    expect(context.body).to.deep.equal({ status: 'ok' })
  })
})
