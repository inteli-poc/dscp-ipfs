const os = require('os')
const path = require('path')
const fs = require('fs/promises')
const fsWithSync = require('fs')
const { spawnSync } = require('child_process')

// this needs to happen before environment variables are parsed. Hence done synchronously here
const ipfsDir = fsWithSync.mkdtempSync(path.join(os.tmpdir(), 'dscp-ipfs-'))
process.env.IPFS_PATH = ipfsDir

const { IPFS_EXECUTABLE } = require('../../app/env')

const { startServer, stopServer } = require('./helper/server')
const { waitForIpfsApi } = require('./helper/ipfs')

exports.mochaGlobalSetup = async function () {
  spawnSync(IPFS_EXECUTABLE, ['init'])
  await fs.copyFile(path.join(__dirname, '..', 'config', 'node-1.json'), path.join(ipfsDir, 'config'))

  this.stopServer = stopServer

  await startServer(this)
  await waitForIpfsApi(`5001`)
}

exports.mochaGlobalTeardown = async function () {
  await this.stopServer(this)
}
