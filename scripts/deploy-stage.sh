#!/bin/bash

DOCKER_COMPOSE_FILE="docker-compose-prod.yml"
BACKEND_URL=161363670536.dkr.ecr.ap-northeast-2.amazonaws.com/lazy_diet

aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin ${BACKEND_URL}

docker pull ${BACKEND_URL}:latest

docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

docker images --quiet --filter=dangling=true | xargs --no-run-if-empty docker rmi