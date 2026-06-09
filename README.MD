# IO System Design

On a Mac, install the tools quickly with Homebrew:

```sh
brew install --cask docker
```

Open Docker Desktop once after installing it.

## Workshop Machine Prep

Run these commands once before the workshop while you have a good internet connection. Docker will cache the images locally, so the examples can reuse them during the workshop without downloading them again.

```sh
npm install

docker pull mongo:7
docker pull node:22-alpine
docker pull nginx:1.27-alpine
docker pull redis:7.2-alpine
docker pull apache/kafka:3.9.1
docker pull alpine/openssl:latest

docker compose -f 02-nginx/docker-compose.yml build
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

Run a local MongoDB container and a Node.js API that inserts, queries, updates, and deletes mock users:

```sh
npm run 03-be-db-app
```

Open `http://localhost:3013`, or import `postman/03-be-db-app.postman_collection.json` to try the CRUD requests.

This example maps the API to `localhost:3013` and MongoDB to `localhost:27031` so it does not conflict with a default local MongoDB on `27017`.

Clean the database container and volume when you are done:

```sh
npm run 03-be-db-app:destroy
```

## 04-replicaset

Run a local MongoDB replica set with one primary, two secondaries, and a Node.js API for trying different write concerns, read concerns, and read preferences:

```sh
npm run 04-replicaset
```

Open `http://localhost:3014`, or import `postman/04-replicaset.postman_collection.json` to try the replica set requests.

This example maps the API to `localhost:3014` and the replica set members to `localhost:27041`, `localhost:27042`, and `localhost:27043`.

Clean the replica set containers and volumes when you are done:

```sh
npm run 04-replicaset:destroy
```

## 05-sharding

Run a local MongoDB sharded cluster with two country shards and a Node.js API for trying targeted shard-key queries, scatter-gather queries, and writes across shard ranges:

```sh
npm run 05-sharding
```

Open `http://localhost:3015`, or import `postman/05-sharding.postman_collection.json` to try the sharding requests.

This example maps the API to `localhost:3015`, the config server to `localhost:27050`, the shard servers to `localhost:27051` and `localhost:27052`, and the `mongos` router to `localhost:27053`.

Clean the sharded cluster containers and volumes when you are done:

```sh
npm run 05-sharding:destroy
```

## 06-blob-storage

Run a Node.js API that creates short-lived signed URLs for uploading to and downloading from S3:

```sh
npm run 06-blob-storage
```

Before running it, copy `06-blob-storage/.env.example` to `06-blob-storage/.env` and fill in the S3 bucket and AWS credentials.

Import `postman/06-blob-storage.postman_collection.json` to request an upload URL, upload a sample file directly to S3, request a download URL, and read the file back.

## 07-caching

Run a local Redis Cluster with three masters, one replica per master, and a Node.js API that stores like counters across cluster keys:

```sh
npm run 07-caching
```

Open `http://localhost:3017`, or import `postman/07-caching.postman_collection.json` to add and read likes.

This example maps the API to `localhost:3017` and Redis nodes to `localhost:6371` through `localhost:6376`.

REDIS CLI COMMANDS:
```sh
docker exec -it io-system-design-07-redis-node-1 redis-cli
cluster nodes
cluster slots
cluster keyslot <key>
```

Clean the Redis cluster containers and volumes when you are done:

```sh
npm run 07-caching:destroy
```

## 08-eda

Run a local Kafka broker, an HTTP ingress producer, and three separate consumer apps:

```sh
npm run 08-eda
```

Open `http://localhost:3018`, or import `postman/08-eda.postman_collection.json` to publish order and incident events.

`GET /order/:id` publishes to the `orders` topic, which is consumed by app 2 and app 3. `GET /incident/:id` publishes to the `incidents` topic, which is consumed by app 4.

Clean the Kafka broker and app containers when you are done:

```sh
npm run 08-eda:destroy
```
