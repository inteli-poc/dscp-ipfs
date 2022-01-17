const { createNodeApi } = require('./api')
const { setupKeyWatcher } = require('./keyWatcher')

module.exports = {
  setupKeyWatcher: async ({ onUpdate }) => {
    const api = await createNodeApi()
    await setupKeyWatcher(api)({ onUpdate })
  },
}
