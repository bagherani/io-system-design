# Architecture: 03-replicaset simplification

## Fit

- `03-replicaset/` owns three MongoDB members, replica-set initialization, and one small Express API.
- Root `package.json` exposes start, database-only, and destroy commands named `03-replicaset`.
- Root `README.MD` contains only short run, request, port, and cleanup instructions.
- `postman/03-replicaset.postman_collection.json` contains the classroom requests in teaching order.
- `AGENTS.MD` already reserves API port `3014` and MongoDB ports `27041`-`27043`; those ports remain unchanged.

## Endpoints

- `GET /` — list the available demonstrations.
- `GET /replica-set/status` — show one primary and two secondary members.
- `POST /photos?writeConcern=all` — insert mock photo metadata with `w: 3`, waiting for all three members.
- `POST /photos?writeConcern=majority` — insert mock photo metadata with `w: "majority"`.
- `POST /photos?writeConcern=primary` — insert mock photo metadata with `w: 1`, waiting only for the primary.
- `GET /photos?readMode=all` — read each member through a direct connection and return the three results side by side; this is also the consistency check.
- `GET /photos?readMode=majority` — read with `readConcern: "majority"` from the primary.
- `GET /photos?readMode=secondaryPreferred` — read with `readPreference: "secondaryPreferred"`.
- `DELETE /photos` — clear lesson data for another run.

MongoDB has no read concern named `all`. In this lesson, read mode `all` means directly querying every member so students can compare their data.

## Data

One `photos` collection in the `replicaSetDemo` database. Each document has `photoId`, `userId`, `caption`, `mediaUrl`, `createdAt`, and `writeConcern` fields. Postman supplies the mock `photoId`, `userId`, `caption`, and `mediaUrl`; the server adds MongoDB's `_id`, `createdAt`, and the effective `writeConcern`. Only metadata is stored; photo bytes belong in blob storage.

## Flow

1. Docker Compose starts three MongoDB containers.
2. The setup container creates replica set `rs0` with one higher-priority member and waits for election.
3. The API connects through the replica-set URI for normal writes and reads.
4. Write requests select one of three explicit write concerns and insert mock photo metadata.
5. Majority and secondary-preferred reads use the replica-set connection.
6. The all-members read uses three direct clients and labels each result with its current MongoDB role.

## External

No external services. Docker Compose uses existing host ports `3014` and `27041`-`27043`.
