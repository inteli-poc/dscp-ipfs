import express from 'express'
import pinoHttp from 'pino-http'

import env from './env.js'
import logger from './logger.js'
import { createNodeApi, setupKeyWatcher, nodeHealthCheck } from './keyWatcher/index.js'
import { ipfsHealthCheck, setupIpfs } from './ipfs.js'
import ServiceWatcher from './utils/ServiceWatcher.js'

export async function createHttpServer() {
  const app = express()
  const requestLogger = pinoHttp({ logger })
  const ipfs = await setupIpfs()
  const api = await createNodeApi()

  const sw = new ServiceWatcher({
    substrate: { healthCheck: () => nodeHealthCheck(api._api) },
    ipfs: { healthCheck: () => ipfsHealthCheck(ipfs) },
  })
  await sw.start()

  await setupKeyWatcher({
    api,
    onUpdate: async (value) => {
      await ipfs.stop()
      await ipfs.start({ swarmKey: value })
    },
  })

  app.use((req, res, next) => {
    if (req.path !== '/health') requestLogger(req, res)
    next()
  })

  app.get('/health', async (req, res) => {
    const statusCode = Object.values(sw.report).some((srv) => ['down', 'error'].includes(srv.status)) ? 503 : 200

    res.status(statusCode).send(sw.report)
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

  return { app, ipfs, sw }
}

/* istanbul ignore next */
export async function startServer() {
  try {
    const { app, ipfs, sw } = await createHttpServer()
    const server = await new Promise((resolve, reject) => {
      const server = app.listen(env.PORT, (err) => {
        if (err) return reject(err)
        logger.info(`Listening on port ${env.PORT} `)
        resolve(server)
      })

      server.on('error', (err) => reject(err))
    })

    const closeHandler = (exitCode) => async () => {
      sw.gen.return()
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
