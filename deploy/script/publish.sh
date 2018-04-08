#! /bin/bash

set -e

REPO=registry.ap-southeast-1.aliyuncs.com/dxg_test/zftapi

if [ $# -lt 1 ]; then
  echo "Usage: ./publish.sh <docker image version>"
  exit 1
fi

docker build . -t $REPO:$1 && \
docker push $REPO:$1