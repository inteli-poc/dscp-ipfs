const { describe, it } = require('mocha')
const { expect } = require('chai')
const { stub } = require('sinon')

const mockNodeApi = require('../__fixtures__/substrate-create-node-api.json')
const NodeApi = require('../../app/keyWatcher/api');


describe('substrate api status watcher', () => {
  let SW
  let createNodeApiMock

  before(() => {
    createNodeApiMock = stub(NodeApi, "createNodeApi").callsFake(() => ({
      _api: {
        isReaady: "true",
        runtimeChain: mockNodeApi.chain,
        runtimeVersion: mockNodeApi.runtime
      }
    }))
    SW = require('../../app/utils/ServiceWatcher')
  })

  it('mmm... does something', async () => {
    await SW.start()
    expect(createNodeApiMock.called).to.equal(true)
    expect(1).to.equal(1)
  })
})
