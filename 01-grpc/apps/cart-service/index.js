const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../../packages/inventory.proto");
const packageDefinition = protoLoader.loadSync(protoPath);
const proto = grpc.loadPackageDefinition(packageDefinition).inventory;
const inventory = new proto.InventoryService(
  "localhost:5001",
  grpc.credentials.createInsecure(),
);

const app = express();

app.post("/add/:productId", (req, res) => {
  const productId = Number(req.params.productId);

  inventory.CheckAvailability({ productId }, (availabilityError, result) => {
    if (availabilityError || result.availability < 1) {
      return res.json(false);
    }

    inventory.DecreaseQuantity({ productId, amount: 1 }, (decreaseError, response) => {
      res.json(!decreaseError && response.success);
    });
  });
});

app.listen(3001, () => {
  console.log("CartService http running on 3001");
});
