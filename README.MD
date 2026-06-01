# IO System Design

On a Mac, install the tools quickly with Homebrew:

```sh
brew install --cask docker
```

Open Docker Desktop once after installing it.

Install dependencies once from the repository root:

```sh
npm install
```

## 01-grpc

Run the gRPC inventory service and HTTP cart service:

```sh
npm run 01-grpc
```

## 02-nginx

Run a local Nginx load balancer in front of two funny Node.js replicas:

```sh
npm run 02-nginx
```

Open `http://localhost:8088` for HTTP, or `https://localhost:8443` for HTTPS with HTTP/2 and a local self-signed certificate.

Clean everything up when you are done:

```sh
npm run 02-nginx:destroy
```

## 03-be-db-app

Run a local MongoDB container and a Node.js script that inserts, queries, updates, and deletes mock users:

```sh
npm run 03-be-db-app
```

This example maps MongoDB to `localhost:27031` so it does not conflict with a default local MongoDB on `27017`.

Clean the database container and volume when you are done:

```sh
npm run 03-be-db-app:destroy
```

## 04-replicaset

Run a local MongoDB replica set with one primary, two secondaries, and a Node.js script that writes to the primary and reads from a secondary:

```sh
npm run 04-replicaset
```

This example maps the replica set members to `localhost:27041`, `localhost:27042`, and `localhost:27043`.

Clean the replica set containers and volumes when you are done:

```sh
npm run 04-replicaset:destroy
```
