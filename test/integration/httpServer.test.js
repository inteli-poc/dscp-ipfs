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

  it('returns 200 along with the report', () => {
    expect(context.response.status).to.equal(200)
  })
})