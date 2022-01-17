const { createHttpServer } = require('../../../app/server')

const logger = require('../../../app/logger')
const { PORT } = require('../../../app/env')

async function startServer(context) {
  const create = await createHttpServer()
  await new Promise((resolve, reject) => {
    context.ipfs = create.ipfs
    context.server = create.app.listen(PORT, (err) => {
      if (err) {
        logger.error('Error  starting app:', err)
        reject(err)
      } else {
        logger.info(`Server is listening on port ${PORT}`)
        resolve()
      }
    })
  })
}

async function stopServer(context) {
  await context.ipfs.stop()
  await new Promise((resolve) => {
    context.server.close(() => resolve())
  })
}

module.exports = {
  startServer,
  stopServer,
}
