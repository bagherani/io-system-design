const os = require("node:os");
const express = require("express");

const PORT = Number(process.env.PORT || 3000);
const SERVER_NAME = process.env.SERVER_NAME || os.hostname();
const app = express();

let requestCount = 0;
app.get("/", (req, res) => {
  requestCount += 1;

  console.log(`[${new Date().toISOString()}] - [${SERVER_NAME}] Received request #${requestCount}.`);
  return res.json({
    message: `I've got a request! This is request #${requestCount}.`,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`${SERVER_NAME} listening on port ${PORT}.`);
});
