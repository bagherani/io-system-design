const http = require('http');

const PORT = process.env.PORT || 3000;
const SERVER_NAME = 'server 1';
const INTERNET_CHECK_URL = process.env.INTERNET_CHECK_URL || 'https://api.ipify.org?format=json';

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/internet-check') {
    try {
      const response = await fetch(INTERNET_CHECK_URL, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return json(res, 502, {
          ok: false,
          serverName: SERVER_NAME,
          outboundReachable: false,
          target: INTERNET_CHECK_URL,
          statusCode: response.status
        });
      }

      const body = await response.json();
      return json(res, 200, {
        ok: true,
        serverName: SERVER_NAME,
        outboundReachable: true,
        target: INTERNET_CHECK_URL,
        publicIp: body.ip || null
      });
    } catch (error) {
      return json(res, 502, {
        ok: false,
        serverName: SERVER_NAME,
        outboundReachable: false,
        target: INTERNET_CHECK_URL,
        error: error.message
      });
    }
  }

  return json(res, 200, {
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
