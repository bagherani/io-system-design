# IO System Design

On a Mac, install the tools quickly with Homebrew:

```sh
brew install --cask docker
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
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
