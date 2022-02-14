const path = require('path')
const envalid = require('envalid')
const dotenv = require('dotenv')

/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: 'test/test.env' })
}

const validateArgs = envalid.makeValidator((input) => {
  const parsed = JSON.parse(input)
  if (!Array.isArray(parsed) || parsed.some((arg) => arg !== `${arg}`)) {
    throw new Error('Invalid argument array %s', input)
  }
  return parsed
})

const vars = envalid.cleanEnv(
  process.env,
  {
    SERVICE_TYPE: envalid.str({ default: 'vitalam-ipfs'.toUpperCase().replace(/-/g, '_') }),
    LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
    PORT: envalid.port({ default: 80, devDefault: 3000 }),
    NODE_HOST: envalid.host({ devDefault: 'localhost' }),
    NODE_PORT: envalid.port({ default: 9944 }),
    IPFS_PATH: envalid.str({ default: '/ipfs', devDefault: path.resolve(__dirname, '..', `data`) }),
    IPFS_EXECUTABLE: envalid.str({
      default: 'ipfs',
      devDefault: path.resolve(__dirname, '..', `node_modules`, '.bin', 'ipfs'),
    }),
    IPFS_ARGS: validateArgs({ default: '["daemon"]' }),
    IPFS_LOG_LEVEL: envalid.str({ default: 'info', devDefault: 'debug' }),
    METADATA_KEY_LENGTH: envalid.num({ default: 32 }),
    METADATA_VALUE_LITERAL_LENGTH: envalid.num({ default: 32 }),
    PROCESS_IDENTIFIER_LENGTH: envalid.num({ default: 32 }),
  },
  {
    strict: true,
  }
)

module.exports = vars
