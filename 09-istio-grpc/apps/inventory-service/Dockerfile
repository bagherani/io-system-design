FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY 01-grpc/packages/inventory.proto ./01-grpc/packages/inventory.proto
COPY 09-istio-grpc/apps/inventory-service/index.js ./09-istio-grpc/apps/inventory-service/index.js

CMD ["node", "09-istio-grpc/apps/inventory-service/index.js"]