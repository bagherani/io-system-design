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
docker pull bitnami/kubectl:latest
docker pull istio/istioctl:1.27.1

docker compose -f 02-nginx/docker-compose.yml build
```

## 01-redis

Run a local 3-node Redis Cluster and a Node.js API demonstrating hot key mitigation (celebrity profile posts list replicated with random suffix sharding):

```sh
npm run 01-redis
```

This starts 3 Redis nodes on ports `6371`, `6372`, `6373`, automatically configures the cluster, and launches the API at `http://localhost:3017`.

### Try the API

Import `postman/01-redis.postman_collection.json` or use `curl`:

1. **Celebrity publishes new posts** (each post ID is prepended to the array across all 3 nodes at `celebrity:taylor:1`, `celebrity:taylor:2`, and `celebrity:taylor:3`):

   ```sh
   curl -X POST http://localhost:3017/celebrity/taylor/posts -H "Content-Type: application/json" -d '{"postId": "100"}'
   curl -X POST http://localhost:3017/celebrity/taylor/posts -H "Content-Type: application/json" -d '{"postId": "200"}'
   curl -X POST http://localhost:3017/celebrity/taylor/posts -H "Content-Type: application/json" -d '{"postId": "300"}'
   ```

2. **Read celebrity posts** (randomly selects 1 of the 3 replica keys to balance heavy read traffic across different cluster nodes):

   ```sh
   curl http://localhost:3017/celebrity/taylor/posts
   ```

   _Response returns `["300", "200", "100"]` along with the chosen suffix and queried key._

3. **Inspect all 3 replica copies across the cluster**:
   ```sh
   curl http://localhost:3017/celebrity/taylor/posts/all
   ```

### Clean Up

```sh
npm run 01-redis:destroy
```

## 02-blob-storage

Run a Node.js API that creates short-lived S3 signed URLs so clients can upload and download files directly without proxying heavy bytes through the backend:

```sh
npm run 02-blob-storage
```

Before running, copy the environment file and set your AWS credentials:

```sh
cp 02-blob-storage/.env.example 02-blob-storage/.env
```

### Try the API

Import `postman/02-blob-storage.postman_collection.json` or use `curl`:

1. **Get a signed upload URL**:

   ```sh
   curl -X POST http://localhost:3016/signed-url/upload \
     -H "Content-Type: application/json" \
     -d '{"key": "demo.txt", "contentType": "text/plain"}'
   ```

2. **Upload directly to S3**:
   Send a `PUT` request with your file content directly to the returned `url`.

3. **Get a signed download URL**:

   ```sh
   curl -X POST http://localhost:3016/signed-url/download \
     -H "Content-Type: application/json" \
     -d '{"key": "demo.txt"}'
   ```

4. **Download directly from S3**:
   Send a `GET` request directly to the returned `url`.

## 03-replicaset

Run one MongoDB primary, two secondaries, and the photo metadata API:

```sh
npm run 03-replicaset
```

Import `postman/03-replicaset.postman_collection.json` to try three write concerns, three read modes, and compare data on every member.

The API uses `localhost:3014`. MongoDB members use `27041`, `27042`, and `27043`.

Clean up:

```sh
npm run 03-replicaset:destroy
```

## 04-eda

Run one Kafka broker, one notification producer, and one consumer:

```sh
npm run 04-eda
```

Import `postman/04-eda.postman_collection.json` and send the editable ten-user request. The producer creates one Kafka event per user without calling a push provider.

Run three consumers to see Kafka share the events between them:

```sh
npm run 04-eda:scale
```

Clean up:

```sh
npm run 04-eda:destroy
```
