# syntax=docker/dockerfile:1.3-labs

ARG IPFS_BUILD_IMAGE_VERSION=1.17-alpine3.15
ARG NODE_RUNTIME_IMAGE_VERSION=16-alpine
FROM golang:$IPFS_BUILD_IMAGE_VERSION AS ipfs_build

ENV SRC_DIR /go/src/github.com/ipfs/go-ipfs

RUN apk add --no-cache git make bash gcc musl-dev

WORKDIR /target

ARG IPFS_TAG="v0.11.0"

RUN <<EOF
set -ex
git clone --branch $IPFS_TAG https://github.com/ipfs/go-ipfs.git $SRC_DIR
cd $SRC_DIR
make build
cp $SRC_DIR/cmd/ipfs/ipfs /target/ipfs
rm -rf $SRC_DIR
EOF

FROM node:$NODE_RUNTIME_IMAGE_VERSION AS runtime
RUN apk add --no-cache curl
RUN npm i -g npm@8.x.x

ARG LOGLEVEL
ENV NPM_CONFIG_LOGLEVEL ${LOGLEVEL}

COPY --from=ipfs_build /target /usr/local/bin

WORKDIR /vitalam-ipfs

# Install base dependencies
COPY . .
RUN npm ci --production

ENV IPFS_PATH=/ipfs

# Expose 80 for healthcheck
EXPOSE 80
# Expose 4001 for ipfs swarm
EXPOSE 4001
# expose 5001 for ipfs api
EXPOSE 5001

HEALTHCHECK CMD curl --fail http://localhost:80/health || exit 1

ENTRYPOINT [ "./app/index.js" ]
