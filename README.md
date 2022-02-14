# vitalam-ipfs

Manages a go-ipfs instance maintaining the private network swarm key based on the value from a `vitalam-node` instance.

## Environment Variables

`vitalam-ipfs` is configured primarily using environment variables as follows:

| variable                      | required |    default     | description                                                                          |
| :---------------------------- | :------: | :------------: | :----------------------------------------------------------------------------------- |
| SERVICE_TYPE                  |    N     | `VITALAM_IPFS` | Service type to appear in logs                                                       |
| PORT                          |    N     |      `80`      | The port for the API to listen on                                                    |
| LOG_LEVEL                     |    N     |     `info`     | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| NODE_HOST                     |    Y     |                | Hostname of the `vitalam-node` to use as the swarm key source                        |
| NODE_PORT                     |    N     |     `9943`     | Websocket port of the `vitalam-node` to use as the swarm key source                  |
| IPFS_PATH                     |    N     |    `/ipfs`     | IPFS data storage path                                                               |
| IPFS_EXECUTABLE               |    N     |     `ipfs`     | Executable to use to run go-ipfs                                                     |
| IPFS_ARGS                     |    N     |  `["daemon"]`  | JSON array of strings to pass as arguments to the `IPFS_EXECUTABLE`                  |
| IPFS_LOG_LEVEL                |    N     |     `info`     | Log level of the go-ipfs child process                                               |
| METADATA_KEY_LENGTH           |    N     |      `32`      | Metadata key length in the substrate node                                            |
| METADATA_VALUE_LITERAL_LENGTH |    N     |      `32`      | Metadata literal value length limit in the substrate node                            |
| PROCESS_IDENTIFIER_LENGTH     |    N     |      `32`      | Process ID Length                                                            |
