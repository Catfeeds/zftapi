#! /bin/bash

set -e

REPO=registry.cn-hangzhou.aliyuncs.com/em_test/api-zft

if [ $# -lt 1 ]; then
  echo "Usage: ./publish.sh <docker image version>"
  exit 1
fi

docker build . -t $REPO:$1 && \
docker push $REPO:$1