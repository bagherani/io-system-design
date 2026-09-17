# Workshop Preparation (macOS)

Please complete this setup before the workshop while you have a reliable internet connection.

## Required Software

Install the following software:
- Git
- Nodejs (>= v22)
- Docker Desktop
- Code Editor (VS-Code preferred)
- Postman (either desktop or vscode extension)

## Download the Workshop Repo
Link will be provided later

## Miro board access
Link will be provided later

## Download the Docker Images

Download these docker images to same time:

```sh
docker pull node:22-alpine
docker pull redis:7.2-alpine
docker pull mongo:7
docker pull apache/kafka:3.9.1
docker pull nginx:1.27-alpine
```

## Verify the Setup

Run:

```sh
node --version
npm --version
docker --version
docker compose version
docker image inspect node:22-alpine redis:7.2-alpine mongo:7 apache/kafka:3.9.1 nginx:1.27-alpine >/dev/null
```

The Node.js version should begin with `v22`.