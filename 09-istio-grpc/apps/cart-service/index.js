const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const protoPath = path.join(__dirname, "../../../01-grpc/packages/inventory.proto");
const packageDefinition = protoLoader.loadSync(protoPath);
const proto = grpc.loadPackageDefinition(packageDefinition).inventory;
const inventoryAddress = process.env.INVENTORY_ADDRESS || "inventory:5001";
const inventory = new proto.InventoryService(
  inventoryAddress,
  grpc.credentials.createInsecure(),
);

const app = express();

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.post("/add/:productId", (req, res) => {
  const productId = Number(req.params.productId);

  inventory.CheckAvailability({ productId }, (availabilityError, result) => {
    if (availabilityError || result.availability < 1) {
      return res.json({ added: false, reason: "unavailable" });
    }

    inventory.DecreaseQuantity({ productId, amount: 1 }, (decreaseError, response) => {
      res.json({ added: !decreaseError && response.success });
    });
  });
});

app.listen(3000, () => {
  console.log(`CartService HTTP running on 3000; inventory=${inventoryAddress}`);
});