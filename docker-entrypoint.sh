#!/bin/sh
set -eu

mkdir -p "${DATA_DIR:-/data}/media"
chown -R node:node "${DATA_DIR:-/data}"
exec runuser -u node -- "$@"
