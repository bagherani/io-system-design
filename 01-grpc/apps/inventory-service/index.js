const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../../packages/inventory.proto");
const packageDefinition = protoLoader.loadSync(protoPath);
const proto = grpc.loadPackageDefinition(packageDefinition).inventory;

const products = [
  { id: 1, quantity: 1 },
  { id: 2, quantity: 0 },
  { id: 3, quantity: 2 },
];

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

const service = {
  CheckAvailability(call, callback) {
    const product = findProduct(call.request.productId);
    callback(null, { availability: product?.quantity || 0 });
  },

  DecreaseQuantity(call, callback) {
    const product = findProduct(call.request.productId);
    const success = Boolean(product && product.quantity >= call.request.amount);

    if (success) {
      product.quantity -= call.request.amount;
    }

    callback(null, { success });
  },
};

const server = new grpc.Server();
server.addService(proto.InventoryService.service, service);
server.bindAsync("0.0.0.0:5001", grpc.ServerCredentials.createInsecure(), () => {
  console.log("InventoryService grpc running on 5001");
});
