const { describe, it } = require('mocha')
const { expect } = require('chai')
const { stub } = require('sinon')

const mockNodeApi = require('../__fixtures__/create-node-api-fn')
const NodeApi = require('../../app/keyWatcher/api');

const ServiceWatcher = require('../../app/utils/ServiceWatcher')

const createNodeApiStub = stub(NodeApi, "createNodeApi")

describe('ServiceWatcher', () => {
  beforeEach(() => {
    createNodeApiStub.callsFake(() => mockNodeApi.available)
    SW = new ServiceWatcher(NodeApi.createNodeApi)
  })

  after(() => {
    createNodeApiStub.restore()
  })

  describe('class methods', () => {
    describe('ServiceWatcher.substratePoll', () => {
      beforeEach(() => {
        createNodeApiStub.callsFake(() => mockNodeApi.available)
        SW = new ServiceWatcher(NodeApi.createNodeApi)
      })

      describe('when isReady is false', () => {
        beforeEach(() => {
          createNodeApiStub.callsFake(() => mockNodeApi.unavailable)
          SW = new ServiceWatcher(NodeApi.createNodeApi)
        })

        it('throws and updates this.report', async () => {
          await SW.start()
          expect(SW.report)
            .to.have.property('substrate')
            .that.includes.all.keys('status', 'error')
          const { status, error } = SW.report.substrate
          expect(status).to.equal('error')
          expect(error.message).to.equal('service is not ready')
        })
      })

      describe('if it fails to retrieve a chain\'s state', () => {
        beforeEach(() => {
          createNodeApiStub.restore()
          SW = new ServiceWatcher(NodeApi.createNodeApi)
        })

        it('catches the error and updates this.report', async () => {
          await SW.start()
          expect(SW.report)
            .to.have.property('substrate')
            .that.includes.all.keys('status', 'error')
          const { status, error } = SW.report.substrate
          expect(status).to.equal('down')
          expect(error.message).to.equal('timeout, no response for 2000ms')
        }).timeout(5000)
      })

      it('persists substrate node status and details in this.report', async () => {
        await SW.start()
        expect(SW.report)
          .to.have.property('substrate')
          .that.includes.all.keys('status', 'details')
        const { status, details } = SW.report.substrate
        expect(status).to.equal('up')
        expect(details).to.deep.equal({
          chain: "Test",
          runtime: {
            name: "dscp-node",
            versions: {
              authoring: 1,
              impl: 1,
              spec: 300,
              transaction: 1
            }
          }
        })
      }).timeout(5000)
    })
  })


  /*
  it.skip('mmm... does something', async () => {
    await SW.start()
    console.log(SW.report)
    expect(createNodeApiMock.called).to.equal(true)
    expect(1).to.equal(1)
  })
  */
})
