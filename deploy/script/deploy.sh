#! /bin/bash

IMAGE_VERSION=${1:-latest}
REPO=registry.cn-hangzhou.aliyuncs.com/em_test/api-zft
docker pull $REPO:$IMAGE_VERSION

function start () {
  docker rm -f api
  docker rmi $(docker images -qf "before=$REPO:$IMAGE_VERSION" -f=reference="$REPO:v*")
  docker run -e ZFT_RDS_HOST -e ZFT_RDS_PORT -e ZFT_RDS_USERNAME -e ZFT_RDS_PASSWORD -e ZFT_RDS_DATABASE \
  	-d -p 8000:8000 --name=api --net=zft  $REPO:$IMAGE_VERSION

}
function test_deploy() {
  docker rm -f test_api_deploy
  docker run -e ZFT_RDS_HOST -e ZFT_RDS_PORT -e ZFT_RDS_USERNAME -e ZFT_RDS_PASSWORD -e ZFT_RDS_DATABASE -d --name test_api_deploy -p 8090:8000 $REPO:$IMAGE_VERSION
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