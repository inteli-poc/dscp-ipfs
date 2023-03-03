import path from 'path'
import fs from 'fs/promises'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import env from '../../app/env.js'
import { startServer, stopServer } from './helper/server.js'
import { waitForIpfsApi } from './helper/ipfs.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const mochaGlobalSetup = async function () {
  spawnSync(env.IPFS_EXECUTABLE, ['init'])
  await fs.copyFile(path.join(__dirname, '..', 'config', 'node-1.json'), path.join(env.IPFS_PATH, 'config'))

  this.stopServer = stopServer

  await startServer(this)
  await waitForIpfsApi(env.IPFS_API_PORT, 0)
}

export const mochaGlobalTeardown = async function () {
  await this.stopServer(this)
}
