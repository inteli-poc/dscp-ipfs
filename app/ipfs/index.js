const IPFS = require('ipfs-core')
const { HttpApi } = require('ipfs-http-server')
const Protector = require('libp2p/src/pnet')

const path = require('path')

const { IPFS_PATH } = require('../env')
const logger = require('../logger')
const { readIpfsConfig } = require('./config')

async function setupIpfs() {
  const configPath = path.resolve(IPFS_PATH, `config`)
  const config = await readIpfsConfig(configPath)

  let ipfs = null
  let api = null
  return {
    start: async ({ swarmKey }) => {
      if (ipfs || api) {
        throw new Error('Cannot start an IPFS node that is already running')
      }

      logger.info('Starting IPFS')
      logger.trace('Starting IPFS with key: %s', `0x${swarmKey.toString('hex')}`)

      ipfs = await IPFS.create({
        start: true,
        config,
        repo: IPFS_PATH,
        silent: true,
        libp2p: {
          modules: {
            connProtector: new Protector(
              Buffer.from(['/key/swarm/psk/1.0.0/', '/base16/', swarmKey.toString('hex')].join('\n'), 'utf8')
            ),
          },
        },
      })
      api = new HttpApi(ipfs)
      await api.start()
    },
    stop: async () => {
      logger.info('Stopping IPFS')
      if (api) {
        await api.stop()
        api = null
      }
      if (ipfs) {
        await ipfs.stop()
        ipfs = null
      }
    },
  }
}

module.exports = {
  setupIpfs,
}
