import { describe, beforeEach, afterEach, it } from 'mocha'
import sinon from 'sinon'
import { expect } from 'chai'

import { setupKeyWatcher } from '../../app/keyWatcher/keyWatcher.js'

const setupPolkadotMock = (context = {}) => {
  return {
    isEventKeyUpdate: sinon.fake.returns(true),
    getCurrentKey: sinon.fake.resolves(new Uint8Array([1, 2, 3, 4])),
    setupEventProcessor: sinon.fake(function (onEvents) {
      setTimeout(() => onEvents(context.events), 1000)
    }),
    ...(context.mocks || {}),
  }
}

const setupClocks = (context) => {
  context.clock = null
  beforeEach(function () {
    if (context.clock) {
      context.clock.restore()
    }
    context.clock = sinon.useFakeTimers()
  })

  afterEach(function () {
    if (context.clock) {
      context.clock.restore()
      context.clock = null
    }
  })
}

describe('keyWatcher', function () {
  const context = {}
  setupClocks(context)

  it('should call updateKey with initial key', async function () {
    const mock = setupPolkadotMock()
    const keyWatcher = setupKeyWatcher(mock)

    const onUpdate = sinon.fake()
    await keyWatcher({ onUpdate })

    expect(onUpdate.calledOnce).to.equal(true)

    const firstCallArgs = onUpdate.args[0]
    expect(firstCallArgs[0]).to.be.a.instanceOf(Buffer)
    expect(firstCallArgs[0]).to.deep.equal(Buffer.from([1, 2, 3, 4]))
  })

  it('should call updateKey again with new key on matching event', async function () {
    const mock = setupPolkadotMock({
      events: [
        {
          event: {
            data: [new Uint8Array([5, 6, 7, 8])],
          },
        },
      ],
    })
    const keyWatcher = setupKeyWatcher(mock)

    const onUpdate = sinon.fake()
    await keyWatcher({ onUpdate })

    context.clock.tick(1000)

    expect(onUpdate.calledTwice).to.equal(true)

    const secondCallArgs = onUpdate.args[1]
    expect(secondCallArgs[0]).to.be.a.instanceOf(Buffer)
    expect(secondCallArgs[0]).to.deep.equal(Buffer.from([5, 6, 7, 8]))
  })

  it('should not call updateKey again with new key on non-matching events', async function () {
    const mock = setupPolkadotMock({
      events: [
        {
          event: {
            data: [new Uint8Array([5, 6, 7, 8])],
          },
        },
      ],
      mocks: {
        isEventKeyUpdate: sinon.fake.returns(false),
      },
    })
    const keyWatcher = setupKeyWatcher(mock)

    const onUpdate = sinon.fake()
    await keyWatcher({ onUpdate })

    context.clock.tick(1000)

    expect(onUpdate.calledOnce).to.equal(true)
  })
})
