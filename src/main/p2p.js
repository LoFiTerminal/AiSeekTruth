const Gun = require('gun');
const EventEmitter = require('events');

class P2PNetwork extends EventEmitter {
  constructor() {
    super();
    this.gun = null;
    this.identity = null;
    this.contactSubscriptions = new Map();
    this.heartbeatInterval = null;
    this.isInitialized = false;
    this.config = {
      actAsRelay: true,      // Default: help strengthen network
      enableMulticast: true,  // Default: discover local peers
      maxRelayStorage: 100,   // Max 100MB for relay data
      customRelays: []        // User can add their own relays
    };
  }

  /**
   * Initialize Gun.js with hybrid P2P/relay mode
   * @param {Object} identity - User's identity
   * @param {Object} userConfig - Optional configuration
   */
  initialize(identity, userConfig = {}) {
    if (this.isInitialized) {
      console.log('P2P network already initialized');
      return;
    }

    this.identity = identity;

    // Merge user config with defaults
    this.config = { ...this.config, ...userConfig };

    // Build relay list
    const publicRelays = [
      'https://gun-manhattan.herokuapp.com/gun',
      'https://gunjs.herokuapp.com/gun',
      'https://e2eec.herokuapp.com/gun',
    ];

    const allRelays = [
      ...publicRelays,
      ...this.config.customRelays
    ];

    console.log('=== P2P Network Configuration ===');
    console.log('Mode: Hybrid (Client + Relay)');
    console.log('Act as relay:', this.config.actAsRelay);
    console.log('Multicast enabled:', this.config.enableMulticast);
    console.log('Connected to', allRelays.length, 'relay servers');
    console.log('Max relay storage:', this.config.maxRelayStorage, 'MB');

    // Initialize Gun with hybrid configuration
    const gunConfig = {
      // Connect to external relays for bootstrap
      peers: allRelays,

      // ENABLE RELAY MODE - Help strengthen the network
      localStorage: this.config.actAsRelay,  // Store & forward messages
      radisk: this.config.actAsRelay,        // Persist relay data

      // Multicast for local peer discovery
      multicast: this.config.enableMulticast ? {
        address: '233.255.255.255',
        port: 8765
      } : false,

      // Don't store too much relay data
      until: this.config.maxRelayStorage * 1024 * 1024, // Convert MB to bytes

      // WebRTC configuration for direct peer connections
      WebRTC: {
        enabled: true,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    };

    this.gun = Gun(gunConfig);

    this.isInitialized = true;

    // Listen for peer connections
    this.gun.on('hi', (peer) => {
      console.log('Connected to peer:', peer.url || 'local peer');
      this.emit('peer:connected', { peer: peer.url || 'local' });
    });

    this.gun.on('bye', (peer) => {
      console.log('Disconnected from peer:', peer.url || 'local peer');
      this.emit('peer:disconnected', { peer: peer.url || 'local' });
    });

    // Announce presence
    this.announceOnline(identity.publicKey, identity.username, 'online');

    // Start heartbeat to maintain presence
    this.startHeartbeat();

    // Log relay statistics periodically
    this.startRelayMonitoring();

    console.log('✅ P2P network initialized (HYBRID MODE) for:', identity.username);
    console.log('🌐 Your app is now helping strengthen the network!');
  }

  /**
   * Announce user is online
   * @param {string} publicKey - User's public key
   * @param {string} username - User's username
   * @param {string} status - User's status (online/away/busy)
   */
  announceOnline(publicKey, username, status = 'online') {
    if (!this.gun) return;

    const presenceData = {
      username,
      status,
      timestamp: Date.now(),
    };

    // Store presence data at public key location
    this.gun.get('presence').get(publicKey).put(presenceData);

    this.emit('status:updated', { publicKey, status });
  }

  /**
   * Subscribe to a contact's messages and presence
   * @param {string} publicKey - Contact's public key
   * @param {Function} callback - Callback for new messages
   */
  subscribeToContact(publicKey, callback) {
    if (!this.gun) return;

    // Avoid duplicate subscriptions
    if (this.contactSubscriptions.has(publicKey)) {
      console.log('Already subscribed to:', publicKey);
      return;
    }

    // Subscribe to messages for this contact
    const messageListener = this.gun
      .get('messages')
      .get(this.identity.publicKey)
      .get(publicKey)
      .on((data, key) => {
        if (data && typeof data === 'object' && data.envelope) {
          callback(data);
        }
      });

    // Subscribe to contact's presence
    this.gun
      .get('presence')
      .get(publicKey)
      .on((data) => {
        if (data && data.status) {
          this.emit('presence:update', {
            publicKey,
            username: data.username,
            status: data.status,
            timestamp: data.timestamp,
          });
        }
      });

    this.contactSubscriptions.set(publicKey, messageListener);
    console.log('Subscribed to contact:', publicKey);
  }

  /**
   * Unsubscribe from a contact
   * @param {string} publicKey - Contact's public key
   */
  unsubscribeFromContact(publicKey) {
    const listener = this.contactSubscriptions.get(publicKey);
    if (listener) {
      listener.off();
      this.contactSubscriptions.delete(publicKey);
      console.log('Unsubscribed from contact:', publicKey);
    }
  }

  /**
   * Send encrypted message envelope to recipient
   * @param {string} recipientKey - Recipient's public key
   * @param {Object} envelope - Message envelope with encrypted data
   */
  sendMessageEnvelope(recipientKey, envelope) {
    if (!this.gun) {
      throw new Error('P2P network not initialized');
    }

    const messageData = {
      envelope,
      timestamp: Date.now(),
    };

    // Store message at recipient's location
    // Path: messages -> recipient -> sender -> messageId
    this.gun
      .get('messages')
      .get(recipientKey)
      .get(this.identity.publicKey)
      .set(messageData);

    console.log('Message envelope sent to:', recipientKey);
  }

  /**
   * Update user status
   * @param {string} publicKey - User's public key
   * @param {string} status - New status (online/away/busy/offline)
   */
  updateStatus(publicKey, status) {
    if (!this.gun) return;

    const presenceData = {
      username: this.identity.username,
      status,
      timestamp: Date.now(),
    };

    this.gun.get('presence').get(publicKey).put(presenceData);

    this.emit('status:updated', { publicKey, status });
    console.log('Status updated to:', status);
  }

  /**
   * Broadcast karma receipt
   * @param {Object} receipt - Karma transaction receipt
   */
  broadcastKarmaReceipt(receipt) {
    if (!this.gun) return;

    const karmaData = {
      from: receipt.from,
      to: receipt.to,
      points: receipt.points,
      reason: receipt.reason,
      timestamp: Date.now(),
      signature: receipt.signature,
    };

    // Store karma receipt
    this.gun.get('karma').get(receipt.to).set(karmaData);

    console.log('Karma receipt broadcasted:', receipt);
  }

  /**
   * Start heartbeat to maintain presence
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.identity && this.gun) {
        this.announceOnline(
          this.identity.publicKey,
          this.identity.username,
          'online'
        );
      }
    }, 30000);

    console.log('Heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }

  /**
   * Start monitoring relay statistics
   */
  startRelayMonitoring() {
    if (!this.config.actAsRelay) return;

    // Log relay stats every 5 minutes
    setInterval(() => {
      const stats = this.getRelayStats();
      console.log('📊 Relay Statistics:', stats);
      this.emit('relay:stats', stats);
    }, 5 * 60 * 1000);
  }

  /**
   * Get relay statistics
   * @returns {Object} Relay statistics
   */
  getRelayStats() {
    if (!this.gun || !this.config.actAsRelay) {
      return {
        enabled: false
      };
    }

    return {
      enabled: true,
      mode: 'hybrid',
      connectedPeers: this.getConnectedPeers().length,
      actingAsRelay: this.config.actAsRelay,
      multicastEnabled: this.config.enableMulticast,
      maxStorage: this.config.maxRelayStorage + ' MB',
      uptime: process.uptime()
    };
  }

  /**
   * Get list of connected peers
   * @returns {Array} List of connected peer URLs
   */
  getConnectedPeers() {
    if (!this.gun || !this.gun.back) return [];

    const peers = [];
    const gunPeers = this.gun.back('opt.peers');

    if (gunPeers) {
      for (let id in gunPeers) {
        const peer = gunPeers[id];
        if (peer && peer.url) {
          peers.push(peer.url);
        }
      }
    }

    return peers;
  }

  /**
   * Update network configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    console.log('Updating P2P network configuration:', newConfig);

    const oldActAsRelay = this.config.actAsRelay;
    this.config = { ...this.config, ...newConfig };

    // If relay mode changed, need to reinitialize
    if (oldActAsRelay !== this.config.actAsRelay) {
      console.log('Relay mode changed, reinitialization required');
      this.emit('config:changed', { requiresRestart: true });
    } else {
      this.emit('config:changed', { requiresRestart: false });
    }
  }

  /**
   * Disconnect from P2P network
   */
  disconnect() {
    this.stopHeartbeat();

    // Announce offline status
    if (this.identity && this.gun) {
      this.updateStatus(this.identity.publicKey, 'offline');
    }

    // Unsubscribe from all contacts
    for (const publicKey of this.contactSubscriptions.keys()) {
      this.unsubscribeFromContact(publicKey);
    }

    this.isInitialized = false;

    if (this.config.actAsRelay) {
      console.log('🌐 Relay mode disabled - no longer helping network');
    }

    console.log('P2P network disconnected');
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      initialized: this.isInitialized,
      subscriptions: this.contactSubscriptions.size,
      mode: this.config.actAsRelay ? 'hybrid (client + relay)' : 'client only',
      relayEnabled: this.config.actAsRelay,
      multicastEnabled: this.config.enableMulticast,
      connectedPeers: this.getConnectedPeers().length
    };
  }
}

// Singleton instance
let p2pInstance = null;

function getP2PInstance() {
  if (!p2pInstance) {
    p2pInstance = new P2PNetwork();
  }
  return p2pInstance;
}

module.exports = {
  getP2PInstance,
  P2PNetwork,
};
