# Vertical Slices: 03-replicaset simplification

1. **Startable photo tracer** — fix `03-replicaset` script and Compose wiring, remove Docker-socket behavior, and expose a hardcoded primary-only photo write plus a normal photo read; prove the lesson starts and the photo round trip works.
2. **Three write concerns** — add `all`, `majority`, and `primary` selection with optional mock photo values; prove each response reports the expected MongoDB write concern.
3. **Replica-set read modes** — add `majority` and `secondaryPreferred` reads; prove each response reports the selected read concern or preference.
4. **Member visibility** — add replica-set status and the direct all-members read; prove one primary and two secondaries return side-by-side photo data.
5. **Classroom handoff** — replace the stale Postman collection, shorten and rename the README section, add cleanup, and prove every request runs in teaching order before destroying the stack.
