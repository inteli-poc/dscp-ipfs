import { before, after } from 'mocha'

import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { spawn, spawnSync } from 'child_process'
import delay from 'delay'
import { fileURLToPath } from 'url'

import env from '../../../app/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const waitForIpfsApi = async (port, peerCount) => {
  for (let waitCount = 0; waitCount < 60; waitCount++) {
    try {
      const fetchRes = await fetch(`http://127.0.0.1:${port}/api/v0/swarm/peers`, { method: 'POST' })
      if (fetchRes.status !== 200) {
        throw new Error()
      }
      const res = await fetchRes.json()
      const { Peers: peers } = res

      if (peerCount === 0) {
        return
      }

      if (peers !== null && peers.length >= peerCount) {
        return
      }
    } catch (err) {
      /* empty */
    } finally {
      await delay(1000)
    }
  }
}

export const setupIPFS = (context, peerCount) => {
  before(async function () {
    context.ipfsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dscp-ipfs-'))

    spawnSync(env.IPFS_EXECUTABLE, ['init'], {
      env: {
        ...process.env,
        IPFS_PATH: context.ipfsDir,
      },
    })

    await fs.copyFile(path.join(__dirname, '..', '..', 'config', 'node-2.json'), path.join(context.ipfsDir, 'config'))

    await fs.writeFile(
      path.join(context.ipfsDir, 'swarm.key'),
      Buffer.from(['/key/swarm/psk/1.0.0/', '/base16/', context.swarmKey.toString('hex')].join('\n'), 'utf8'),
      { mode: 0o400 }
    )

    context.ipfs = spawn(env.IPFS_EXECUTABLE, env.IPFS_ARGS, {
      env: {
        ...process.env,
        LIBP2PFORCEPNET: 1,
        IPFS_PATH: context.ipfsDir,
      },
    })

    await waitForIpfsApi(`5002`, peerCount)
  })

  after(async function () {
    context.ipfs.kill()
  })
}
