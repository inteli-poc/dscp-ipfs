const { before, after } = require('mocha')

const os = require('os')
const path = require('path')
const fs = require('fs/promises')
const { spawn, spawnSync } = require('child_process')

const fetch = require('node-fetch')
const delay = require('delay')

const { IPFS_EXECUTABLE, IPFS_ARGS } = require('../../../app/env')

const waitForIpfsApi = async (port) => {
  for (let waitCount = 0; waitCount < 60; waitCount++) {
    try {
      const fetchRes = await fetch(`http://localhost:${port}/api/v0/version`, { method: 'POST' })
      if (fetchRes.status !== 200) {
        throw new Error()
      }
      break
    } catch (err) {
      await delay(1000)
    }
  }
}

const setupIPFS = (context) => {
  before(async function () {
    context.ipfsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dscp-ipfs-'))

    spawnSync(IPFS_EXECUTABLE, ['init'], {
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

    context.ipfs = spawn(IPFS_EXECUTABLE, IPFS_ARGS, {
      env: {
        ...process.env,
        LIBP2PFORCEPNET: 1,
        IPFS_PATH: context.ipfsDir,
      },
    })

    await waitForIpfsApi(`5002`)
  })

  after(async function () {
    context.ipfs.kill()
  })
}

module.exports = {
  setupIPFS,
  waitForIpfsApi,
}
