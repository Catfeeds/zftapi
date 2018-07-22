#! /bin/bash

set -e

docker run -v /home/kpse/db:/db -p 3306:3306 -e MYSQL_ROOT_PASSWORD -e TZ --net=zft --name=db -d mysql:5.7 --init-file /db/init.sql --character-set-server=utf8 --explicit_defaults_for_timestamp --sql-mode=""

docker run -d -p 6379:6379 --net=zft --name=redis registry.docker-cn.com/library/redis:4