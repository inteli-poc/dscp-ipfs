import logger from '../logger.js'

export const setupKeyWatcher =
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
        if (api.isEventKeyUpdate(event)) {
          onKeyUpdate(event.data[0])
        }
      })
    })
    const key = await api.getCurrentKey()
    onKeyUpdate(key)
  }
