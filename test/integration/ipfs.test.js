import fetch from 'node-fetch'
import { FormData, Blob } from 'formdata-node'

import { expect } from 'chai'
import delay from 'delay'

import { getSwarmKey, setSwarmKey } from './helper/api.js'
import { setupIPFS, waitForIpfsApi } from './helper/ipfs.js'

const uploadA = async (fileName, contents) => {
  const form = new FormData()
  form.append('file', new Blob([contents]), fileName)
  const body = await fetch(`http://localhost:5001/api/v0/add?cid-version=0`, {
    method: 'POST',
    body: form,
  })

  return (await body.json()).Hash
}

const download = (port) => async (hash) => {
  const controller = new AbortController()
  setTimeout(() => {
    controller.abort()
  }, 500)

  const contentBody = await fetch(`http://localhost:${port}/api/v0/cat?arg=${hash}`, {
    method: 'POST',
    signal: controller.signal,
  })
  const contentText = await contentBody.text()
  return contentText
}

const downloadA = download(`5001`)
const downloadB = download(`5002`)

const setupIpfsWithSwarm = async (context) => {
  before(async function () {
    context.swarmKey = await getSwarmKey()
  })

  setupIPFS(context)
}

describe('ipfs', function () {
  describe('read a file uploaded to node A from node A', function () {
    const context = {}

    before(async function () {
      context.hash = await uploadA('test-file-1.txt', 'Test 1')
    })

    it('should be retrievable', async function () {
      const contentText = await downloadA(context.hash)
      expect(contentText).to.equal('Test 1')
    })
  })

  describe('read a file uploaded to node A from node B with same swarm key', function () {
    const context = {}
    setupIpfsWithSwarm(context)

    before(async function () {
      context.hash = await uploadA('test-file-2.txt', 'Test 2')
    })

    it('should be retrievable', async function () {
      let contentText = null
      let error = null
      try {
        contentText = await downloadB(context.hash)
      } catch (err) {
        error = err.name || err
      }
      expect(error).to.equal(null)
      expect(contentText).to.equal('Test 2')
    })
  })

  describe('try read a file uploaded to node A from node B with different swarm key', function () {
    const context = {
      swarmKey: Buffer.from(new Array(32).fill(42)),
    }

    setupIPFS(context)

    before(async function () {
      context.hash = await uploadA('test-file-3.txt', 'Test 3')
    })

    it('should not be retrievable', async function () {
      let contentText = null
      let error = null
      try {
        contentText = await downloadB(context.hash)
      } catch (err) {
        error = err.name || err
      }
      expect(contentText).to.equal(null)
      expect(error).to.equal('AbortError')
    })
  })

  describe('read a file uploaded to node A from node B with updated swarm key', function () {
    const context = {
      swarmKey: Buffer.from(new Array(32).fill(null).map(() => Math.floor(256 * Math.random()))),
    }

    setupIPFS(context)

    before(async function () {
      context.hash = await uploadA('test-file-4.txt', 'Test 4')
      await setSwarmKey(context.swarmKey)
      await delay(500)
      await waitForIpfsApi(`5001`)
    })

    it('should be retrievable', async function () {
      let contentText = null
      let error = null
      try {
        contentText = await downloadB(context.hash)
      } catch (err) {
        error = err.name || err
      }
      expect(error).to.equal(null)
      expect(contentText).to.equal('Test 4')
    })
  })
})
