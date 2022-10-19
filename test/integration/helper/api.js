import { createNodeApi } from '../../../app/keyWatcher/api.js'

let nodeApi = null
export const getSwarmKey = async () => {
  if (nodeApi === null) {
    nodeApi = await createNodeApi()
  }
  const key = await nodeApi.getCurrentKey()
  return Buffer.from(key)
}

export const setSwarmKey = async (swarmKey) => {
  const api = nodeApi._api
  await api.isReady
  const sudo = nodeApi._keyring.addFromUri('//Alice')

  return new Promise((resolve) => {
    let unsub = null
    api.tx.sudo
      .sudo(api.tx.ipfsKey.updateKey(`0x${swarmKey.toString('hex')}`))
      .signAndSend(sudo, (result) => {
        if (result.status.isInBlock) {
          const tokens = result.events
            .filter(({ event: { method } }) => method === 'Minted')
            .map(({ event: { data } }) => data[0].toNumber())

          unsub()
          resolve(tokens)
        }
      })
      .then((res) => {
        unsub = res
      })
  })
}
