import { describe, it } from 'mocha'
import { expect } from 'chai'
import { spy } from 'sinon'

import substrate from '../__fixtures__/substrate-node-api-fn.js'
import ipfs from '../__fixtures__/ipfs-api-fn.js'
import ServiceWatcher from '../../app/utils/ServiceWatcher.js'
import { TimeoutError, ConnectionError } from '../../app/utils/Errors.js'

const connectionErrorMsg = 'Connection is not established, will retry during next polling cycle'

describe('ServiceWatcher', function () {
  this.timeout(5000)

  let SW
  Number.prototype.toNumber = function () {
    return parseInt(this)
  }
  beforeEach(() => {
    SW = new ServiceWatcher({ substrate: substrate.available })
  })

  afterEach(() => {
    SW.gen?.return()
  })

  describe('delay method', () => {
    it('rejects with TimeoutError if second argument is supplied', () => {
      return SW.delay(10, { name: 'test' })
        .then((res) => {
          throw new Error('was not supposed to succeed', res)
        })
        .catch((err) => {
          expect(err.message).to.be.equal('Timeout error, no response from a service')
        })
    })

    it('delays and resolves a promise without a result', async () => {
      const result = await SW.delay(10)
      expect(result).to.be.undefined
    })
  })

  describe('update method', () => {
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

  describe('init method', () => {
    it('returns an array of services with polling functions', () => {
      SW = new ServiceWatcher({ substrate: substrate.available })
      expect(SW.services.length).to.equal(1)
      expect(SW.services[0]).to.include({
        name: 'substrate',
      })
      expect(SW.services[0].poll).to.be.a('function')
    })

    it('does not include services that do not have a polling function', () => {
      SW = new ServiceWatcher({ service1: {}, service2: {} })
      expect(SW.services.length).to.equal(0)
    })
  })

  describe('if invalid argument supplied to constructor', () => {
    beforeEach(async () => {
      SW = new ServiceWatcher('some-test-data')
      SW.start()
    })

    it('does not add to the services array', () => {
      expect(SW.services).to.deep.equal([])
    })

    it('does not create a new instance of generator', () => {
      expect(SW.gen).to.be.undefined
    })

    it('and has nothing to report', () => {
      expect(SW.report).to.deep.equal({})
    })
  })

  describe('ipfs - service check', () => {
    beforeEach(async () => {
      SW = new ServiceWatcher({ ipfs: ipfs.available })
      SW.start()
      await SW.delay(1000)
    })

    // TODO more coverage for ipfs
    it('persist ipfs status and details in this.report object', () => {
      expect(SW.report) // prettier-ignore
        .to.have.property('ipfs')
        .that.includes.all.keys('status', 'details')
        .that.deep.equal({
          status: 'up',
          details: {
            killed: false,
            pid: 10,
            spawnfile: '/path/to/file/test/spawn.key',
          },
        })
    })
  })

  describe('substrate - service checks', () => {
    beforeEach(() => {
      SW = new ServiceWatcher({ substrate: substrate.available })
    })

    describe('when service is unavailable', () => {
      beforeEach(async () => {
        SW = new ServiceWatcher({ substrate: substrate.unavailable })
        spy(SW, 'update')
        SW.start()
        await SW.delay(1500)
        SW.gen.return()
      })

      it('creates an instance of ConnectionError', () => {
        expect(SW.report.substrate) // prettier-ignore
          .to.have.property('error')
          .that.is.a.instanceOf(ConnectionError)
      })

      it('reflects status in this.report object with error message', () => {
        expect(SW.report) // prettier-ignore
          .to.have.property('substrate')
          .that.includes.all.keys('status', 'error')
          .that.deep.contain({ status: 'error' })
        expect(SW.report.substrate.error) // prettier-ignore
          .to.have.all.keys('message', 'service')
          .that.contains({
            message: connectionErrorMsg,
          })
      })

      it('does not stop polling', () => {
        expect(SW.update.getCall(0).args[0]).to.equal('substrate')
        expect(SW.update.getCall(1).args[0]).to.equal('substrate')
        expect(SW.update.getCall(1).args[1])
          .to.have.property('error')
          .that.have.all.keys('message', 'service')
          .that.contains({
            message: connectionErrorMsg,
            service: 'substrate',
          })
      })
    })

    describe('and reports correctly when service status changes', () => {
      beforeEach(async () => {
        SW = new ServiceWatcher({ substrate: substrate.unavailable })
        spy(SW, 'update')
        SW.start()
        await SW.delay(1000)
        SW.services = [
          {
            name: 'substrate',
            poll: () => substrate.available.healthCheck(substrate.available, 'substrate'),
          },
        ]
        await SW.delay(1000)
      })

      it('handles correctly unavalaible service', () => {
        expect(SW.update.getCall(0).args[0]).to.equal('substrate')
        expect(SW.update.getCall(0).args[1]) // prettier-ignore
          .to.include.all.keys('error', 'status')
          .that.property('error')
          .contains({
            message: connectionErrorMsg,
            service: 'substrate',
          })
      })

      it('updates this.report indicating that service is available', () => {
        expect(SW.update.callCount).to.equal(2)
        expect(SW.update.getCall(1).args).to.deep.equal([
          'substrate',
          {
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
          },
        ])
      })
    })

    describe('if it hits timeout first', () => {
      beforeEach(async () => {
        SW = new ServiceWatcher({ substrate: substrate.timeout })
        spy(SW, 'update')
        await SW.start() // using await so it hits timeout
        await SW.delay(3000)
      })

      it('creates an instance of timeout error with error message', () => {
        const { error } = SW.report.substrate

        expect(error).to.be.a.instanceOf(TimeoutError)
        expect(error.message).to.equal('Timeout error, no response from a service')
      })

      it('updates this.report with new status and error object', () => {
        expect(SW.report) // prettier-ignore
          .to.have.property('substrate')
          .that.includes.all.keys('status', 'error')
          .that.deep.contain({ status: 'error' })
      })

      it('continues polling', () => {
        expect(SW.update.callCount).to.equal(2)
      })
    })

    it('persists substrate node status and details in this.report', async () => {
      SW.start()
      await SW.delay(2000)
      SW.gen.return()

      expect(SW.report) // prettier-ignore
        .to.have.property('substrate')
        .that.includes.all.keys('status', 'details')
        .that.deep.equal({
          status: 'up', // TODO implement snapshot assertation for mocha
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
    })
  })
})
