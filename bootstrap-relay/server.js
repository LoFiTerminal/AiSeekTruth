// AiSeekTruth Bootstrap Relay - Single File Version for Easy Deployment
// Copy this entire file to Glitch.com or any Node.js hosting

const http = require('http');
const port = process.env.PORT || 8765;

// Create HTTP server with CORS
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

  res.end('AiSeekTruth Bootstrap Relay v1.0 - Ready!\n');
});

// Initialize Gun.js
let Gun;
try {
  Gun = require('gun');
  require('gun/axe');

  const gun = Gun({
    web: server,
    localStorage: true,   // ENABLE storage for message persistence
    radisk: true,         // ENABLE disk persistence
    axe: true             // Keep DHT enabled
  });

  console.log('✅ Gun.js initialized with AXE DHT');
} catch (e) {
  console.log('⚠️  Gun.js not found, running as simple HTTP relay');
  console.log('   Run: npm install gun');
}

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log('🚀 AiSeekTruth Bootstrap Relay');
  console.log(`📡 Port: ${port}`);
  console.log(`🌐 URL: http://localhost:${port}/gun`);
  console.log('✅ Ready to connect users!');
});

// Keep alive
setInterval(() => {
  console.log(`💓 ${new Date().toISOString()}`);
}, 60000);
