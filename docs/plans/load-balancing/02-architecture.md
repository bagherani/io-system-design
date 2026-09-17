# Architecture: Load Balancing Lesson

## Fit

This lesson fills the existing `05-load-balancing` folder. Docker Compose runs one Nginx entry point and three explicit copies of the same Node.js counter API. Nginx is the only public service and forwards each request to one app instance. Root npm scripts start, reload, and destroy the lesson. The root README, project instructions, and a small Postman collection document the demo.

## Endpoints

- `GET /content/counts?ids=video-123` — return a fixed view and like count plus the app instance that handled the request.

## Data

No database or persistent data. The response uses a fixed mock count so traffic distribution remains the lesson's only moving part.

## Flow

1. Postman or curl sends a request to Nginx on host port `3022`.
2. Nginx selects one of `app-1`, `app-2`, or `app-3` on internal port `3000`.
3. The selected Node.js process returns the mock count and its instance name.
4. Nginx returns that response to the client.
5. After an instructor edits `nginx.conf`, an npm reload script validates the config and signals Nginx to reload it without recreating the app containers.

## External

No third-party services or secrets. Docker uses the existing `node:22-alpine` and `nginx:1.27-alpine` workshop images. Only host port `3022` is added; app ports remain private to the Compose network.