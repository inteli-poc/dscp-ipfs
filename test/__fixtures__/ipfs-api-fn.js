import { ipfsHealthCheck } from '../../app/ipfs.js'

export default {
  available: {
    ipfs: {
      pid: 10,
      spawnfile: '/path/to/file/test/spawn.key',
      killed: false,
    },
    healthCheck: ipfsHealthCheck,
  },
}
