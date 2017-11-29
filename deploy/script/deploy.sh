#! /bin/bash

IMAGE_VERSION=${1:-latest}
docker pull registry.docker-cn.com/kpse/api-zft:$IMAGE_VERSION

function start () {
  docker rm -f api
  docker rmi $(docker images -qf "before=registry.docker-cn.com/kpse/api-zft:$IMAGE_VERSION" -f=reference='registry.docker-cn.com/kpse/api-zft:v*')
  docker run -e ZFT_RDS_HOST -e ZFT_RDS_PORT -e ZFT_RDS_USERNAME -e ZFT_RDS_PASSWORD -e ZFT_RDS_DATABASE \
  	-d -p 8000:8000 --name=api --net=zft  registry.docker-cn.com/kpse/api-zft:$IMAGE_VERSION

}
function test_deploy() {
  docker rm -f test_api_deploy
  docker run -e ZFT_RDS_HOST -e ZFT_RDS_PORT -e ZFT_RDS_USERNAME -e ZFT_RDS_PASSWORD -e ZFT_RDS_DATABASE -d --name test_api_deploy -p 8090:8000 registry.docker-cn.com/kpse/api-zft:$IMAGE_VERSION
}

function test_curl() {
  response=$(curl --write-out %{http_code} --silent --output /dev/null http://localhost:8090/v1.0/contracts)
  if [[ $response == "200" ]]; then
    echo successful test curl && docker rm -f test_api_deploy;
  else
    echo failed test curl && exit 1;
  fi
}

test_deploy

sleep 5

test_curl && start