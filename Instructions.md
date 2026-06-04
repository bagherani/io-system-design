# Project Instructions

This repository is for teaching system design concepts with small, runnable examples.

- Keep examples simple, visual, and easy to explain in a lesson.
- Prefer minimal code that demonstrates the concept clearly over production-style complexity.
- Keep root documentation focused on how to run each example. Avoid long testing guides, extension setup, or extra explanation unless asked.
- Use plain JavaScript/Node.js patterns unless a lesson needs something else.
- Keep JavaScript dependencies and runnable npm scripts in the root `package.json` rather than adding per-lesson packages.
- Prefer Docker Compose for local container infrastructure unless a lesson is specifically teaching another provisioning tool.
- When adding or changing Docker-backed lessons, keep the root README's workshop machine prep section updated with any new `docker pull` commands and local image build commands students should run once before the workshop.
- Avoid port conflicts between lessons. Check existing examples before choosing new host ports. Current lesson-owned host ports include `3001`, `4101`, `4102`, `8088`, `8443`, `27031` for `03-be-db-app` MongoDB, `27041`-`27043` for `04-replicaset` MongoDB, `27050`-`27053` for `05-sharding` MongoDB, and `3017` plus `6371`-`6376` for `07-caching` Redis.
- Add small `.http` files for request demos when useful, similar to `01-grpc/cart-service.http`.
- Keep infrastructure local and easy to clean up.
- Do not over-abstract early. Students should be able to read the files and understand the flow.

Future agents may update this file as the project evolves. If the teaching style, conventions, or lesson structure changes, adjust these instructions so future work stays aligned.
