# Program Design: 03-replicaset simplification

## Files

- `03-replicaset/docker-compose.yml` — keep three MongoDB members and ports, remove Docker socket access, and run the correct `03-replicaset/index.js` path.
- `03-replicaset/index.js` — replace event and failover behavior with explicit photo writes and reads.
- `package.json` — rename the stale `04-replicaset` scripts and paths to `03-replicaset`.
- `README.MD` — rename the lesson section and keep only start, requests, ports, and cleanup guidance.
- `postman/04-replicaset.postman_collection.json` — remove the stale collection.
- `postman/03-replicaset.postman_collection.json` — add status, three writes, three reads, and cleanup in lesson order.

`03-replicaset/init-replica-set.js` and `AGENTS.MD` need no change: initialization is already explicit, and the ports are already reserved.

## Types & signatures

```js
const writeConcerns = {
  all: { w: 3 },
  majority: { w: "majority" },
  primary: { w: 1 },
};

function wait(milliseconds) {}
async function connectWithRetry(client, attempts = 20) {}
function createPhoto(requestBody, writeConcernName) {}
async function getReplicaSetStatus(database) {}
async function readAllMembers(
  primaryClient,
  secondaryOneClient,
  secondaryTwoClient,
) {}
async function main() {}
```

Mock photo documents have this shape:

```js
{
  photoId: String,
  userId: String,
  caption: String,
  mediaUrl: String,
  createdAt: Date,
  writeConcern: "all" | "majority" | "primary"
}
```

The three direct clients are declared explicitly with `directConnection: true` and `readPreference: "secondaryPreferred"`, allowing the API to read whichever role each named member currently holds.

## Call Stack

Write flow:

1. Express handles `POST /photos`.
2. The route validates `writeConcern` against `writeConcerns`.
3. `createPhoto` copies photo metadata from the Postman body and adds server-owned fields.
4. The replica-set client inserts into `photos` with the selected write concern.
5. The route returns the inserted metadata and effective MongoDB write concern.

Replica-set read flow:

1. Express handles `GET /photos` with `majority` or `secondaryPreferred`.
2. The route selects the explicit read concern or read preference.
3. The replica-set client reads `photos` and returns the mode and documents.

All-members read flow:

1. Express handles `GET /photos?readMode=all`.
2. `readAllMembers` queries the three explicit direct clients.
3. Each client runs `hello` to report its current role.
4. The response returns the role and photo documents for each member side by side.

## Test Plan

- `docker compose config` succeeds for `03-replicaset/docker-compose.yml`.
- `node --check 03-replicaset/index.js` succeeds.
- `npm run 03-replicaset` starts one primary, two secondaries, and the API on port `3014`.
- Status response reports exactly one `PRIMARY` and two `SECONDARY` members.
- Each write mode inserts a photo and reports `w: 3`, `w: "majority"`, or `w: 1` respectively.
- Majority read reports majority read concern.
- Secondary-preferred read reports secondary-preferred routing.
- All-members read returns three labeled member results containing the inserted photo IDs after replication catches up.
- `npm run 03-replicaset:destroy` removes the lesson containers and volumes.
- Postman collection JSON parses successfully and references only port `3014`.

## Least Confident Decisions

1. The `all` read is intentionally a lesson term, not a MongoDB read concern; the response will state that it queried every member directly.
2. A read immediately after a `w: 1` write may briefly differ across members. That visible convergence is useful for the consistency lesson rather than an API error.
3. Each Postman write has a concrete mock photo body; MongoDB generates `_id`, while the API sets `createdAt` and `writeConcern`.
