const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../../../01-grpc/packages/inventory.proto");
const packageDefinition = protoLoader.loadSync(protoPath);
const proto = grpc.loadPackageDefinition(packageDefinition).inventory;

const products = new Map([
  [1, 1],
  [2, 0],
  [3, 2],
]);

const service = {
  CheckAvailability(call, callback) {
    callback(null, { availability: products.get(call.request.productId) || 0 });
  },

  DecreaseQuantity(call, callback) {
    const quantity = products.get(call.request.productId) || 0;
    const success = quantity >= call.request.amount;

    if (success) {
      products.set(call.request.productId, quantity - call.request.amount);
    }

    callback(null, { success });
  },
};

const server = new grpc.Server();
server.addService(proto.InventoryService.service, service);
server.bindAsync(
  "0.0.0.0:5001",
  grpc.ServerCredentials.createInsecure(),
  () => console.log("InventoryService gRPC running on 5001"),
);