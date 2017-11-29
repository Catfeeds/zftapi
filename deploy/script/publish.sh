#! /bin/bash

set -e

if [ $# -lt 1 ]; then
  echo "Usage: ./publish.sh <docker image version>"
  exit 1
fi

docker build . -t kpse/api-zft:$1 && \
docker push kpse/api-zft:$1