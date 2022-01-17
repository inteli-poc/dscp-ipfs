const logger = require('../logger')

const setupKeyWatcher =
  (api) =>
  async ({ onUpdate }) => {
    const onKeyUpdate = (keyU8Array) => {
      const key = Buffer.from(keyU8Array)
      logger.info('IPFS Key updated')
      logger.trace('IPFS key: %s', key.toString('hex'))
      onUpdate(key)
    }

    await api.setupEventProcessor((events) => {
      logger.trace('Observed event count: %i', events.length)
      events.forEach((record) => {
        // Extract the phase, event and the event types
        const { event } = record
        const { data, typeDef: types } = event

        if (api.isEventKeyUpdate(event)) {
          const keyIndex = types.findIndex(({ type }) => type === 'Key')
          onKeyUpdate(data[keyIndex])
        }
      })
    })
    const key = await api.getCurrentKey()
    onKeyUpdate(key)
  }

module.exports = {
  setupKeyWatcher,
}
