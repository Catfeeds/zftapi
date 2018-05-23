#!/usr/bin/env bash

set -e

function functional-tests {
    docker-compose down && \
    docker-compose -f docker-compose-test.yml down && \
    docker-compose -f docker-compose-test.yml run --rm test
}


function usage {
  echo Usage:
  echo ======================
  echo l for eslint
  echo u for unit tests
  echo f for functional tests
  echo a for both above
  echo none of the above will trigger 'npm t' only
  echo ======================
}


function main {
  	case $1 in
		l) npm run lint ;;
		u) npm t ;;
		f) functional-tests ;;
		a) npm t && functional-tests ;;
		h) usage ;;
		*) usage ;;
	esac
}

main $@