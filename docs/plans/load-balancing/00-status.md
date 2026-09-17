# Status: Load Balancing Lesson

- Gate 1 — Product: APPROVED 2026-09-17
- Gate 2 — Architecture: APPROVED 2026-09-17
- Gate 3 — Program Design: APPROVED 2026-09-17
- Gate 4 — Slice plan: APPROVED 2026-09-17

## Slices

- [x] Slice 1 — Run one Nginx entry point in front of three identifiable mock counter apps and prove round-robin responses.
- [x] Slice 2 — Add documented algorithm alternatives plus validated live reload and cleanup scripts.
- [x] Slice 3 — Add the Postman request, README lesson instructions, and port reservation in project instructions.

## Notes for a fresh session

The lesson should let students send one simple view-count request repeatedly and see three responders share the work. It must remain small, runnable from root npm scripts, avoid existing host ports, support configuration reloads, include a Postman collection, and update the root README and project instructions.
