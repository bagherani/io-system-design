# Kubernetes + Envoy + Istio + gRPC

This disposable workshop example runs two Node.js services in Kubernetes:

```text
curl -> Istio ingress gateway -> Envoy sidecar -> CartService (HTTP)
                                                   |
                                                   +-> Envoy sidecar -> InventoryService (gRPC)
```

The services use the gRPC contract from `01-grpc/packages/inventory.proto`.
Istio injects an Envoy sidecar into each pod. The manifest also demonstrates an
Istio Gateway, VirtualService retries, and a DestinationRule with a small
circuit-breaker-style connection pool and outlier ejection policy.

## Prerequisites

- Docker Desktop with Kubernetes enabled in Settings > Kubernetes.
- The Docker daemon must be running.
- No host `kubectl`, `istioctl`, Node.js, or gRPC installation is required.

The commands below run `kubectl` and `istioctl` from Docker containers. On the
first run, Docker downloads the CLI images.

## Install Istio in Docker Desktop Kubernetes

From the repository root:

```sh
docker run --rm -it \
  -v "$HOME/.kube:/root/.kube" \
  -v "$HOME/.istio:/root/.istio" \
  istio/istioctl:1.27.1 install --set profile=demo -y
```

Verify that Istio is ready:

```sh
docker run --rm -v "$HOME/.kube:/root/.kube" bitnami/kubectl:latest \
  get pods -n istio-system
```

## Build and deploy

Build both application images into Docker Desktop's local image store:

```sh
docker build -f 09-istio-grpc/apps/inventory-service/Dockerfile -t io-system-design/inventory:local .
docker build -f 09-istio-grpc/apps/cart-service/Dockerfile -t io-system-design/cart:local .
```

Apply the namespace, services, workloads, and Istio routing objects:

```sh
docker run --rm -v "$HOME/.kube:/root/.kube" -v "$PWD:/work" -w /work \
  bitnami/kubectl:latest apply -f 09-istio-grpc/k8s.yaml
```

Wait for both application pods and their Envoy sidecars:

```sh
docker run --rm -v "$HOME/.kube:/root/.kube" bitnami/kubectl:latest \
  wait --for=condition=Ready pod -l app=cart -n istio-grpc --timeout=120s
docker run --rm -v "$HOME/.kube:/root/.kube" bitnami/kubectl:latest \
  get pods -n istio-grpc
```

Each application pod should show `2/2` containers.

## Test the request path

Find the Istio ingress gateway address:

```sh
docker run --rm -v "$HOME/.kube:/root/.kube" bitnami/kubectl:latest \
  get svc istio-ingressgateway -n istio-system
```

With Docker Desktop, port 80 is normally available at `localhost`. Test the
cart endpoint through the gateway:

```sh
curl -X POST http://localhost/add/1
curl -X POST http://localhost/add/2
curl http://localhost/healthz
```

Product 1 succeeds once, product 2 is unavailable, and `/healthz` confirms the
HTTP route. The cart-to-inventory call is gRPC and is routed through the two
Envoy sidecars.

Inspect the mesh configuration and sidecar statistics:

```sh
docker run --rm -v "$HOME/.kube:/root/.kube" -v "$PWD:/work" -w /work \
  istio/istioctl:1.27.1 analyze -n istio-grpc
docker run --rm -v "$HOME/.kube:/root/.kube" istio/istioctl:1.27.1 \
  proxy-status
```

## Clean up

```sh
docker run --rm -v "$HOME/.kube:/root/.kube" -v "$PWD:/work" -w /work \
  bitnami/kubectl:latest delete -f 09-istio-grpc/k8s.yaml
docker rmi io-system-design/inventory:local io-system-design/cart:local
```

To remove Istio itself, run the matching Dockerized command:

```sh
docker run --rm -it -v "$HOME/.kube:/root/.kube" istio/istioctl:1.27.1 uninstall --purge -y
```
