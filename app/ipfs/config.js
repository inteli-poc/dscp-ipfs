const fs = require('fs/promises')

const logger = require('../logger')

async function readIpfsConfig(configPath) {
  let config = {}
  // read and parse config file
  try {
    const raw = await fs.readFile(configPath, { encoding: 'utf8' })
    config = JSON.parse(raw)
  } catch (error) {
    logger.error('IPFS config not found or invalid. Error was: %s', error.message)
    throw new Error('IPFS config not found or invalid')
  }
  return config
}

module.exports = {
  readIpfsConfig,
}
