const { describe, it } = require('mocha')
const { expect } = require('chai')
const { stub } = require('sinon')

const mockNodeApi = require('../__fixtures__/create-node-api-fn')
const NodeApi = require('../../app/keyWatcher/api')
const ServiceWatcher = require('../../app/utils/ServiceWatcher')

const createNodeApiStub = stub(NodeApi, 'createNodeApi')

describe('ServiceWatcher', () => {
  let SW
  Number.prototype.toNumber = function () {
    return parseInt(this)
  }
  beforeEach(() => {
    createNodeApiStub.callsFake(() => mockNodeApi.available)
    SW = new ServiceWatcher(NodeApi.createNodeApi)
  })

  after(() => {
    createNodeApiStub.restore()
  })

  describe('ServiceWatcher.delay', () => {
    it('returns a desired result after delay', async () => {
      const result = await SW.delay(10, { result: 'test' })
      expect(result).to.deep.equal({
        result: 'test',
      })
    })

    it('delays and resolves a promise without a result', async () => {
      const result = await SW.delay(10)
      expect(result).to.be.undefined
    })
  })

  describe('ServiceWatcher.update', () => {
    describe('if invalid arguments provided', () => {
      const invalidTypes = [[1, 2], 1, {}]

      it('returns null if first argument is not supplied and does not update report', () => {
        SW.update()
        expect(SW.report).to.deep.equal({})
      })

      invalidTypes.forEach((type) => {
        const typeText = type instanceof Array ? 'array' : null || typeof type
        it(`also if first arguments is of a type: ${typeText}`, () => {
          SW.update(type)
          expect(SW.report).to.deep.equals({})
        })
      })
    })

    it('updates this.report with supplied details', () => {
      const details = { a: 'a', b: 'b', c: [] }
      SW.update('test', details)
      expect(SW.report).to.deep.equal({
        test: details,
      })
    })

    it('sets details - unknown if second argumnent is not provided', () => {
      SW.update('test-no-details')
      expect(SW.report).to.deep.equal({
        'test-no-details': 'unknown',
      })
    })
  })

  describe('ServiceWatcher.init', () => {
    it('returns an array of objects with polling functions', () => {
      const array = SW.init()
      expect(array.length).to.equal(1)
      expect(array[0]).to.include({
        name: 'substrate',
      })
      expect(array[0].poll).to.be.a('function')
    })
  })

  describe('ServiceWatcher.substratePoll', () => {
    beforeEach(() => {
      createNodeApiStub.callsFake(() => mockNodeApi.available)
      SW = new ServiceWatcher(NodeApi.createNodeApi)
    })

    describe('when invalid argument supplied', () => {
      beforeEach(() => {
        SW = new ServiceWatcher(() => 'some-function')
      })

      it('catches error and reports', async () => {
        await SW.start()

        expect(SW.report) // prettier-ignore
          .to.have.property('substrate')
          .that.includes.all.keys(['status', 'error'])
          .that.deep.contain({ status: 'error' })
        expect(SW.report.substrate.error.message).to.equal("Cannot read properties of undefined (reading 'isReady')")
      })
    })

    describe('when isReady is false', () => {
      beforeEach(() => {
        createNodeApiStub.callsFake(() => mockNodeApi.unavailable)
        SW = new ServiceWatcher(NodeApi.createNodeApi)
      })

      it('throws and updates this.report', async () => {
        await SW.start()

        expect(SW.report) // prettier-ignore
          .to.have.property('substrate')
          .that.includes.all.keys('status', 'error')
          .that.deep.contain({ status: 'error' })
        expect(SW.report.substrate.error.message)
          .to.equal('service is not ready') // prettier-ignore
      })
    })

    describe('if it hits timeout first', () => {
      beforeEach(() => {
        createNodeApiStub.callsFake(() => mockNodeApi.timeout)
        SW = new ServiceWatcher(NodeApi.createNodeApi)
      })

      it('resolves timeout error and reflects in this.report', async () => {
        await SW.start()

        expect(SW.report) // prettier-ignore
          .to.have.property('substrate')
          .that.includes.all.keys('status', 'error')
          .that.deep.contain({ status: 'down' })
        expect(SW.report.substrate.error.message) // prettier-ignore
          .to.equal('timeout, no response for 2000ms')
      }).timeout(5000)
    })

    it('persists substrate node status and details in this.report', async () => {
      await SW.start()

      expect(SW.report) // prettier-ignore
        .to.have.property('substrate')
        .that.includes.all.keys('status', 'details')
        .that.deep.equal({
          status: 'up',
          details: {
            chain: 'Test',
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
    }).timeout(5000)
  })
})
