const { ApiPromise, WsProvider } = require('@polkadot/api')

const { API_HOST, API_PORT } = require('./env')
const logger = require('./logger')

const provider = new WsProvider(`ws://${API_HOST}:${API_PORT}`)
const metadata = {
  provider,
  types: {
    Address: 'MultiAddress',
    LookupSource: 'MultiAddress',
    PeerId: 'Vec<u8>',
    Key: 'Vec<u8>',
    TokenId: 'u128',
    TokenMetadata: 'Hash',
    Token: {
      id: 'TokenId',
      owner: 'AccountId',
      creator: 'AccountId',
      created_at: 'BlockNumber',
      destroyed_at: 'Option<BlockNumber>',
      metadata: 'TokenMetadata',
      parents: 'Vec<TokenId>',
      children: 'Option<Vec<TokenId>>',
    },
  },
}

async function setupKeyWatcher({ onUpdate }) {
  const api = await ApiPromise.create(metadata)
  const result = {}

  let ipfsKey = null
  await api.query.system.events((events) => {
    logger.trace('Observed event count: %i', events.length)
    events.forEach((record) => {
      // Extract the phase, event and the event types
      const { event } = record
      const { data, typeDef: types } = event

      if (api.events.ipfsKey.UpdateKey.is(record.event)) {
        const keyIndex = types.findIndex(({ type }) => type === 'Key')
        const key = Buffer.from(data[keyIndex])

        logger.debug('New IPFS key: %s', key.toString('hex'))

        ipfsKey = Buffer.from(data[keyIndex])
        onUpdate(ipfsKey)
      }
    })
  })

  const key = Buffer.from(await api.query.ipfsKey.key())
  logger.debug('Fetched IPFS key: %s', key.toString('hex'))
  ipfsKey = key
  onUpdate(ipfsKey)

  return result
}

module.exports = {
  setupKeyWatcher,
}
