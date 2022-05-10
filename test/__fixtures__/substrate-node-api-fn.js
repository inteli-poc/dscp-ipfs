const { nodeHealthCheck } = require("../../app/keyWatcher")

module.exports = {
  timeout: {
    get _isConnected() {
      return new Promise(r => setTimeout(r, 5000))
    },
    healthCheck: nodeHealthCheck,
  },
  unavailable: {
    get _isConnected() {
      return false
    },
    healthCheck: nodeHealthCheck,
  },
  available: {
    healthCheck: nodeHealthCheck,
    get _isConnected() {
      return true
    },
    get _runtimeChain() {
      return "Test"
    },
    get _runtimeVersion() {
      return {
        specName: "dscp-node",
        implName: "dscp-node",
        authoringVersion: 1,
        specVersion: 300,
        implVersion: 1,
        apis: [
          [
            "0xdf6acb689907609b",
            3
          ],
          [
            "0x37e397fc7c91f5e4",
            1
          ],
          [
            "0x40fe3ad401f8959a",
            4
          ],
          [
            "0xd2bc9897eed08f15",
            2
          ],
          [
            "0xf78b278be53f454c",
            2
          ],
          [
            "0xdd718d5cc53262d4",
            1
          ],
          [
            "0xab3c0572291feb8b",
            1
          ],
          [
            "0xed99c5acb25eedf5",
            2
          ],
          [
            "0xbc9d89904f5b923f",
            1
          ],
          [
            "0x37c8bb1350a9a2a8",
            1
          ]
        ],
        "transactionVersion": 1
      }
    }
  }
}