const http = require('http');
const Gun = require('gun');

class RelayServer {
  constructor() {
    this.server = null;
    this.gun = null;
    this.port = 8765;
    this.isRunning = false;
    this.publicUrl = null;
  }

  /**
   * Start the Gun relay server
   */
  start() {
    if (this.isRunning) {
      console.log('Relay server already running');
      return this.publicUrl;
    }

    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.server = http.createServer((req, res) => {
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

          res.end('AiSeekTruth P2P Relay\n');
        });

        // Initialize Gun relay
        this.gun = Gun({
          web: this.server,
          localStorage: false, // Lightweight relay
          radisk: false,
          axe: true
        });

        // Start listening
        this.server.listen(this.port, '0.0.0.0', async () => {
          this.isRunning = true;
          console.log(`🚀 Relay server started on port ${this.port}`);

          // Discover public IP
          const publicIp = await this.discoverPublicIP();

          if (publicIp) {
            this.publicUrl = `http://${publicIp}:${this.port}/gun`;
            console.log(`📡 Public URL: ${this.publicUrl}`);
            console.log(`⚠️  Note: Port ${this.port} must be forwarded on your router`);
          } else {
            // Fallback to localhost
            this.publicUrl = `http://localhost:${this.port}/gun`;
            console.log(`📡 Local URL: ${this.publicUrl}`);
            console.log(`⚠️  For internet access, you need to:`);
            console.log(`   1. Forward port ${this.port} on your router`);
            console.log(`   2. Share your public IP with others`);
          }

          resolve(this.publicUrl);
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${this.port} already in use, trying next port...`);
            this.port++;
            this.start().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Discover public IP using STUN-like technique
   */
  async discoverPublicIP() {
    try {
      // Use a public service to discover IP
      const https = require('https');

      return new Promise((resolve) => {
        const req = https.get('https://api.ipify.org?format=json', (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json.ip);
            } catch {
              resolve(null);
            }
          });
        });

        req.on('error', () => {
          resolve(null);
        });

        req.setTimeout(5000, () => {
          req.destroy();
          resolve(null);
        });
      });
    } catch {
      return null;
    }
  }

  /**
   * Stop the relay server
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.isRunning = false;
      console.log('Relay server stopped');
    }
  }

  /**
   * Get connection info for sharing
   */
  getConnectionInfo() {
    return {
      url: this.publicUrl,
      port: this.port,
      isRunning: this.isRunning,
      instructions: [
        '1. Forward port ' + this.port + ' on your router (if needed)',
        '2. Share this URL with contacts',
        '3. They add it in Settings → Network → Custom Relays'
      ]
    };
  }
}

// Singleton instance
let relayInstance = null;

function getRelayServer() {
  if (!relayInstance) {
    relayInstance = new RelayServer();
  }
  return relayInstance;
}

module.exports = {
  getRelayServer,
  RelayServer
};
