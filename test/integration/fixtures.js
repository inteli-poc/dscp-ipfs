import path from 'path'
import fs from 'fs/promises'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import { IPFS_EXECUTABLE, IPFS_API_PORT, IPFS_PATH } from '../../app/env.js'
import { startServer, stopServer } from './helper/server.js'
import { waitForIpfsApi } from './helper/ipfs.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const mochaGlobalSetup = async function () {
  spawnSync(IPFS_EXECUTABLE, ['init'])
  await fs.copyFile(path.join(__dirname, '..', 'config', 'node-1.json'), path.join(IPFS_PATH, 'config'))

  this.stopServer = stopServer

  await startServer(this)
  await waitForIpfsApi(IPFS_API_PORT)
}

export const mochaGlobalTeardown = async function () {
  await this.stopServer(this)
}
