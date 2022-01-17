const express = require('express')
const pinoHttp = require('pino-http')

const { PORT } = require('./env')
const logger = require('./logger')
const { setupKeyWatcher } = require('./keyWatcher')
const { setupIpfs } = require('./ipfs')

async function createHttpServer() {
  const app = express()
  const requestLogger = pinoHttp({ logger })
  const ipfs = await setupIpfs()

  await setupKeyWatcher({
    onUpdate: async (value) => {
      await ipfs.stop()
      await ipfs.start({ swarmKey: value })
    },
  })

  await app.use((req, res, next) => {
    if (req.path !== '/health') requestLogger(req, res)
    next()
  })

  app.get('/health', async (req, res) => {
    res.status(200).send({ status: 'ok' })
  })

  // Sorry - app.use checks arity
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status) {
      res.status(err.status).send({ error: err.status === 401 ? 'Unauthorised' : err.message })
    } else {
      logger.error('Fallback Error %j', err.stack)
      res.status(500).send('Fatal error!')
    }
  })

  return { app, ipfs }
}

/* istanbul ignore next */
async function startServer() {
  try {
    const { app, ipfs } = await createHttpServer()

    const server = await new Promise((resolve, reject) => {
      let resolved = false
      const server = app.listen(PORT, (err) => {
        if (err) {
          if (!resolved) {
            resolved = true
            reject(err)
          }
        }
        logger.info(`Listening on port ${PORT} `)
        if (!resolved) {
          resolved = true
          resolve(server)
        }
      })
      server.on('error', (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })
    })

    const closeHandler = (exitCode) => async () => {
      server.close(async () => {
        await ipfs.stop()
        process.exit(exitCode)
      })
    }

    // on unexpected close just shutdown the server
    ipfs.on('unexpected-close', function () {
      closeHandler(1)()
    })

    const setupGracefulExit = ({ sigName, exitCode }) => {
      process.on(sigName, closeHandler(exitCode))
    }
    setupGracefulExit({ sigName: 'SIGINT', server, exitCode: 0 })
    setupGracefulExit({ sigName: 'SIGTERM', server, exitCode: 143 })
  } catch (err) {
    logger.fatal('Fatal error during initialisation: %s', err.message)
    process.exit(1)
  }
}

module.exports = { startServer, createHttpServer }
