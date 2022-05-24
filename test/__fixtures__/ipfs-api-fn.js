const { ipfsHealthCheack } = require('../../app/ipfs');

module.exports = {
  available: {
    ipfs: {
      pid: 10,
      spawnfile: '/path/to/file/test/spawn.key',
      killed: false,
    },
    healthCheck: ipfsHealthCheack,
  }
}