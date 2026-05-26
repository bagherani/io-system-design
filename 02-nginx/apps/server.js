const os = require("node:os");
const express = require("express");

const PORT = Number(process.env.PORT || 3000);
const SERVER_NAME = process.env.SERVER_NAME || os.hostname();
const app = express();

let requestCount = 0;

const motivationSentenceOfTheDay = [
  'Just do it',
  'Believe in yourself',
  'You can do it',
  'You are strong',
  'You are capable',
  'You are worthy',
  'You are deserving',
  'You are loved',
  'You are appreciated',
];

function getServerInfo(req) {
  return {
    replica: SERVER_NAME,
    hostname: os.hostname(),
    processId: process.pid,
    port: PORT,
    localAddress: req.socket.localAddress,
    localPort: req.socket.localPort,
    remoteAddress: req.socket.remoteAddress,
    uptimeSeconds: Math.round(process.uptime()),
  };
}

app.get("/", (req, res) => {
  requestCount += 1;

  const sentence = motivationSentenceOfTheDay[requestCount % motivationSentenceOfTheDay.length];

  return res.json({
    message: `Request #${requestCount} was ${sentence}.`,
    ok: true,
    server: getServerInfo(req),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`${SERVER_NAME} listening on port ${PORT}.`);
});
