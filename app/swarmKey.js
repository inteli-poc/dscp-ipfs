const path = require('path')
const fs = require('fs/promises')
const { IPFS_PATH } = require('./env')
const logger = require('./logger')

const swarmKeyPath = path.join(IPFS_PATH, 'swarm.key')

async function removeSwarmKeyFile() {
  try {
    await fs.rm(swarmKeyPath)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn('Error removing old swarm key file at %s', swarmKeyPath)
    }
  }
}

async function createSwarmKeyFile({ swarmKey }) {
  logger.info('Writing IPFS swarm key to: %s', swarmKeyPath)
  logger.trace('Writing IPFS swarm key with: %s', `0x${swarmKey.toString('hex')}`)

  await removeSwarmKeyFile()

  await fs.writeFile(
    swarmKeyPath,
    Buffer.from(['/key/swarm/psk/1.0.0/', '/base16/', swarmKey.toString('hex')].join('\n'), 'utf8'),
    { mode: 0o400 }
  )
}

module.exports = {
  removeSwarmKeyFile,
  createSwarmKeyFile,
}
