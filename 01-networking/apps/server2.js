const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVER_NAME = 'server 2';

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  json(res, 200, {
    ok: true,
    message: 'hello from private app server',
    serverName: SERVER_NAME,
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  console.log(`${SERVER_NAME} listening on port ${PORT}`);
});
