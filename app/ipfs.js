const { spawn } = require('child_process')
const EventEmitter = require('events')

const { IPFS_PATH, IPFS_EXECUTABLE, IPFS_ARGS, IPFS_LOG_LEVEL } = require('./env')
const logger = require('./logger')

const { createSwarmKeyFile, removeSwarmKeyFile } = require('./swarmKey')

async function setupIpfs() {
  let ipfs = null
  let ipfsLogger = logger.child({ module: 'ipfs' }, { level: IPFS_LOG_LEVEL })

  const that = new EventEmitter()

  const unexpectedCloseListener = (code) => {
    ipfsLogger.error('IPFS process unexpectedly exited with code %s', code)
    ipfs = null
    that.emit('unexpected-close')
  }

  Object.assign(that, {
    start: async ({ swarmKey }) => {
      if (ipfs) {
        throw new Error('Cannot start an IPFS node that is already running')
      }

      await createSwarmKeyFile({ swarmKey })

      logger.info('Swarm key written, starting IPFS')

      ipfs = spawn(IPFS_EXECUTABLE, IPFS_ARGS, {
        env: {
          ...process.env,
          LIBP2PFORCEPNET: 1,
          IPFS_PATH,
        },
      })

      ipfs.stdout.on('data', (data) => {
        const dataString = `${data}`
        for (const line of dataString.split('\n')) {
          ipfsLogger.debug('IPFS: %s', line)
        }
      })

      ipfs.stderr.on('data', (data) => {
        const dataString = `${data}`
        for (const line of dataString.split('\n')) {
          ipfsLogger.warn('IPFS: %s', line)
        }
      })

      ipfs.on('close', unexpectedCloseListener)
    },
    stop: async () => {
      logger.info('Stopping IPFS')

      try {
        await new Promise((resolve, reject) => {
          if (ipfs) {
            ipfs.removeListener('close', unexpectedCloseListener)
            ipfs.on('close', () => {
              ipfs = null
              resolve()
            })
            ipfs.on('error', (err) => {
              ipfs = null
              reject(err)
            })
            ipfs.kill()
          } else {
            resolve()
          }
        })
      } catch (err) {
        logger.error('Error closing IPFS. Error was $s', err.message || err)
      }
      await removeSwarmKeyFile()
    },
  })

  return that
}

module.exports = {
  setupIpfs,
}
