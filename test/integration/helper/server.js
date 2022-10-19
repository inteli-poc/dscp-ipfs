import { createHttpServer } from '../../../app/server.js'
import logger from '../../../app/logger.js'
import env from '../../../app/env.js'

export async function startServer(context) {
  const create = await createHttpServer()
  await new Promise((resolve, reject) => {
    context.ipfs = create.ipfs
    context.server = create.app.listen(env.PORT, (err) => {
      if (err) {
        logger.error('Error starting app:', err)
        reject(err)
      } else {
        logger.info(`Server is listening on port ${env.PORT}`)
        resolve()
      }
    })
  })
}

export async function stopServer(context) {
  await context.ipfs.stop()
  await new Promise((resolve) => {
    context.server.close(() => resolve())
  })
}
