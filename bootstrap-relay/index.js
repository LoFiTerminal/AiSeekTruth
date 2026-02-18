const Gun = require('gun');
const http = require('http');

const port = process.env.PORT || 8765;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  
  res.end('AiSeekTruth Bootstrap Relay v1.0\n');
});

// Initialize Gun with relay mode - STORAGE ENABLED FOR MESSAGE PERSISTENCE
const gun = Gun({
  web: server,
  localStorage: true,  // ✅ ENABLE storage - messages will persist!
  radisk: true,        // ✅ ENABLE disk persistence
  axe: true,           // Enable DHT
  multicast: false     // Not needed for cloud relay
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 AiSeekTruth Bootstrap Relay`);
  console.log(`📡 Port: ${port}`);
  console.log(`🌐 Mode: Lightweight bootstrap + DHT`);
  console.log(`✅ Ready to connect users!`);
});

// Keep alive
setInterval(() => {
  console.log(`💓 Relay alive - ${new Date().toISOString()}`);
}, 60000);
