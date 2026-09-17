# Program Design: Load Balancing Lesson

## Files

- `05-load-balancing/index.js` — define the single mock counter endpoint and identify the responding instance.
- `05-load-balancing/docker-compose.yml` — run three explicit app services and one public Nginx service.
- `05-load-balancing/nginx.conf` — define the upstream pool, proxy behavior, explanatory comments, and switchable round-robin, least-connections, and IP-hash examples.
- `package.json` — add start, reload, and destroy scripts for the lesson.
- `README.MD` — document startup, repeated requests, algorithm switching, reload, and cleanup.
- `AGENTS.MD` — reserve host port `3022` for this lesson.
- `postman/05-load-balancing.postman_collection.json` — provide one repeatable counter-read request.
- `docs/plans/load-balancing/00-status.md` — track gate approvals and implementation slices.

## Types & Signatures

```js
const port = Number(process.env.PORT || 3000);
const instanceName = process.env.INSTANCE_NAME || "local-app";

app.get("/content/counts", (req, res) => {});
```

Response shape:

```json
{
  "counts": {
    "video-123": {
      "views": 125000,
      "likes": 4200
    }
  },
  "servedBy": "app-1"
}
```

Root script contracts:

```text
npm run 05-load-balancing
npm run 05-load-balancing:reload
npm run 05-load-balancing:destroy
```

## Call Stack

Counter read:

1. Postman or curl calls `localhost:3022/content/counts?ids=video-123`.
2. Nginx receives the request at its `server` block.
3. The configured upstream algorithm chooses one app service.
4. Express handles `GET /content/counts`.
5. Express returns fixed counts and `INSTANCE_NAME`.
6. Nginx proxies the JSON response to the client.

Configuration reload:

1. The instructor edits the bind-mounted `nginx.conf`.
2. The npm reload script runs `nginx -t` inside the Nginx container.
3. If validation succeeds, the script runs `nginx -s reload`.
4. Nginx begins using the selected algorithm without restarting the app services.

## Test Plan

- `node --check 05-load-balancing/index.js` — the app entrypoint parses successfully.
- `docker compose -f 05-load-balancing/docker-compose.yml config` — the Compose topology is valid.
- `nginx -t` through the reload script — the mounted Nginx configuration is valid before reload.
- Repeated counter reads — 12 requests return HTTP 200, fixed counts, and all three instance names under default round-robin.
- Reload — changing to another documented algorithm and running the reload script keeps the public endpoint available.
- JSON parse — the Postman collection is valid JSON and targets host port `3022`.

## Least Confident Decisions

1. The architecture uses the system-design contract's batch-style `ids` query while returning one fixed content ID; this preserves the lesson vocabulary without adding parsing logic.
2. Only Nginx publishes a host port, so students identify app instances from response bodies and Compose logs rather than calling each app directly.
3. The reload script intentionally fails when Nginx is not running because reload only has meaning for an active lesson.