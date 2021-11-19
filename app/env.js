const path = require('path')
const envalid = require('envalid')
const dotenv = require('dotenv')

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
}

const vars = envalid.cleanEnv(
  process.env,
  {
    SERVICE_TYPE: envalid.str({ default: 'vitalam-ipfs'.toUpperCase().replace(/-/g, '_') }),
    LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
    PORT: envalid.port({ default: 80, devDefault: 3000 }),
    API_HOST: envalid.host({ devDefault: 'localhost' }),
    API_PORT: envalid.port({ default: 9944 }),
    IPFS_PATH: envalid.str({ default: '/ipfs', devDefault: path.resolve(__dirname, `data`) }),
  },
  {
    strict: true,
  }
)

module.exports = vars
