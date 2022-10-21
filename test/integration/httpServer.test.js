import { describe, before, it } from 'mocha'
import { expect } from 'chai'
import fetch from 'node-fetch'

import env from '../../app/env.js'

describe('health checks', function () {
  const context = {}

  before(async function () {
    context.response = await fetch(`http://localhost:${env.PORT}/health`)
    context.body = await context.response.json()
  })

  it('returns 200 along with the report', () => {
    expect(context.response.status).to.equal(200)
  })
})
