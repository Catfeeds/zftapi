#! /bin/bash

set -e

REPO=kpse/api-zft

if [ $# -lt 1 ]; then
  echo "Usage: ./publish.sh <docker image version>"
  exit 1
fi

docker build . -t $REPO:$1 && \
docker push $REPO:$1