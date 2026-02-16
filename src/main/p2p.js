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
  }

  /**
   * Initialize Gun.js with public relay servers
   * @param {Object} identity - User's identity
   */
  initialize(identity) {
    if (this.isInitialized) {
      console.log('P2P network already initialized');
      return;
    }

    this.identity = identity;

    // Initialize Gun with public relay servers
    this.gun = Gun({
      peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://gunjs.herokuapp.com/gun',
        'https://e2eec.herokuapp.com/gun',
      ],
      localStorage: false, // Don't store in localStorage
      radisk: false, // Don't use disk storage
    });

    this.isInitialized = true;

    // Announce presence
    this.announceOnline(identity.publicKey, identity.username, 'online');

    // Start heartbeat to maintain presence
    this.startHeartbeat();

    console.log('P2P network initialized for:', identity.username);
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
    console.log('P2P network disconnected');
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      initialized: this.isInitialized,
      subscriptions: this.contactSubscriptions.size,
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
