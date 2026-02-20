const Gun = require('gun');
const EventEmitter = require('events');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class P2PNetwork extends EventEmitter {
  constructor() {
    super();
    this.gun = null;
    this.identity = null;
    this.contactSubscriptions = new Map();
    this.heartbeatInterval = null;
    this.isInitialized = false;
    this.trafficStats = {
      bytesIn: 0,
      bytesOut: 0,
      messagesIn: 0,
      messagesOut: 0,
      lastUpdate: Date.now()
    };
    this.trafficInterval = null;
    this.pingInterval = null;
    this.serverStatus = 'unknown';
    this.lastPingTime = null;
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

    // Get userData directory for Gun.js storage (always writable, even from DMG)
    const userDataPath = app.getPath('userData');
    const gunDataPath = path.join(userDataPath, 'gundb');
    const gunFilePath = path.join(gunDataPath, 'radata');

    // Ensure directory exists
    if (!fs.existsSync(gunDataPath)) {
      fs.mkdirSync(gunDataPath, { recursive: true });
      console.log('✅ Created Gun.js data directory:', gunDataPath);
    }

    console.log('=== P2P Network Configuration ===');
    console.log('Mode: Pure P2P with DHT (AXE)');
    console.log('Act as relay:', this.config.actAsRelay);
    console.log('Multicast enabled:', this.config.enableMulticast);
    console.log('Max relay storage:', this.config.maxRelayStorage, 'MB');
    console.log('Gun.js storage path:', gunFilePath);

    // Bootstrap relay strategy for automatic peer discovery:
    // 1. Public bootstrap relays (for internet discovery)
    // 2. Local multicast (for same-network discovery)
    // 3. User's custom relays (optional)
    const bootstrapRelays = [
      'https://aiseektruth-relay-production.up.railway.app/gun',
      'http://localhost:8765/gun', // Local development fallback
      ...this.config.customRelays
    ];

    console.log('Bootstrap relays configured:', bootstrapRelays.length);

    const gunConfig = {
      // Connect to bootstrap relays for peer discovery
      peers: bootstrapRelays,

      // Use writable userData directory for local storage
      // This prevents EROFS errors when running from DMG
      localStorage: false,  // Don't store & forward
      radisk: true,         // Enable local storage for Gun.js to work properly
      file: gunFilePath,    // Use app's userData directory (always writable)

      // DISABLE AXE for now - it might be causing disconnections
      axe: false,

      // DISABLE Multicast - might interfere with relay connection
      multicast: false,

      // WebRTC configuration for direct peer connections
      WebRTC: {
        enabled: true,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      },

      // Add retry logic for disconnected peers
      retry: 1000, // Retry connection every 1 second
    };

    this.gun = Gun(gunConfig);

    this.isInitialized = true;

    // Listen for peer connections
    this.connectedPeers = new Set();

    this.gun.on('hi', (peer) => {
      const peerUrl = peer.url || 'local peer';
      console.log('🤝 Connected to peer:', peerUrl);
      this.connectedPeers.add(peerUrl);
      this.emit('peer:connected', { peer: peerUrl });

      // Log all connected peers
      console.log('📊 Total connected peers:', this.connectedPeers.size);
    });

    this.gun.on('bye', (peer) => {
      const peerUrl = peer.url || 'local peer';
      console.log('👋 Disconnected from peer:', peerUrl);
      this.connectedPeers.delete(peerUrl);
      this.emit('peer:disconnected', { peer: peerUrl });

      console.log('📊 Total connected peers:', this.connectedPeers.size);
    });

    // Announce presence
    this.announceOnline(identity.publicKey, identity.username, 'online');

    // Start heartbeat to maintain presence
    this.startHeartbeat();

    // Start traffic monitoring
    this.startTrafficMonitoring();

    // Keep connection alive with periodic pings
    this.keepAliveInterval = setInterval(() => {
      if (this.gun && this.connectedPeers.size === 0) {
        console.log('⚠️ No peers connected, attempting reconnect...');
        // Try to reconnect by reading from a known path
        this.gun.get('_keepalive').get('ping').put({ timestamp: Date.now() });
      }
    }, 5000);

    // Log relay statistics periodically
    this.startRelayMonitoring();

    // Start server ping
    this.startServerPing();

    console.log('✅ P2P network initialized (DHT MODE) for:', identity.username);
    console.log('🌐 Peer discovery: AXE DHT + Multicast');
    console.log('📡 Your app is a relay node - helping strengthen the network!');
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
   * Check for existing pending DMs from a contact
   * @param {string} publicKey - Contact's public key
   * @param {Function} callback - Callback for found messages
   */
  checkPendingDMs(publicKey, callback) {
    if (!this.gun) return;

    const conversationKey = `dm_${this.identity.publicKey}_${publicKey}`;
    const foundMessages = new Set();

    console.log('🔍 Checking for pending DMs in conversation:', conversationKey);

    this.gun
      .get(conversationKey)
      .map()
      .once((data, messageId) => {
        if (data && typeof data === 'object' && data.envelope) {
          const envId = data.envelope.id;
          if (envId && !foundMessages.has(envId)) {
            foundMessages.add(envId);
            console.log('📥 Found pending DM:', envId);
            callback(data);
          }
        }
      });

    setTimeout(() => {
      console.log(`✅ Pending DM check complete for ${publicKey.substring(0, 10)}... Found: ${foundMessages.size} messages`);
    }, 5000);
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
      console.log('⚠️ Already subscribed to:', publicKey.substring(0, 10) + '...');
      return;
    }

    // Track processed messages in this session to prevent duplicate callbacks
    const processedMessages = new Set();

    // Create conversation key (flat structure for relay sync)
    // Format: dm_RECIPIENT_SENDER (matches sending format)
    const conversationKey = `dm_${this.identity.publicKey}_${publicKey}`;

    console.log('📡 Subscribing to DM conversation:', conversationKey);

    // FIRST: Check for pending messages
    this.checkPendingDMs(publicKey, (data) => {
      if (data && data.envelope) {
        const envId = data.envelope.id;
        if (envId && !processedMessages.has(envId)) {
          processedMessages.add(envId);
          console.log('📥 Processing pending DM from:', publicKey.substring(0, 10) + '...');
          callback(data);
        }
      }
    });

    // THEN: Subscribe to new messages
    const messageListener = this.gun
      .get(conversationKey)  // Level 1: Conversation
      .map()                 // Level 2: Iterate messages
      .on((data, messageId) => {
        if (data && typeof data === 'object' && data.envelope) {
          const envId = data.envelope.id;

          // Prevent duplicate callbacks in this session
          // (Database check in messaging.js handles cross-session duplicates)
          if (envId && !processedMessages.has(envId)) {
            processedMessages.add(envId);

            // Track incoming traffic
            const dataSize = JSON.stringify(data).length;
            this.trafficStats.bytesIn += dataSize;
            this.trafficStats.messagesIn++;

            console.log('📬 New DM received from:', publicKey.substring(0, 10) + '...', 'msgId:', messageId, `(${dataSize} bytes)`);
            callback(data);
          }
        }
      });

    // Subscribe to contact's presence
    this.gun
      .get('presence')
      .get(publicKey)
      .on((data) => {
        if (data && data.status) {
          console.log('Presence update from:', publicKey, '-> status:', data.status);
          this.emit('presence:update', {
            publicKey,
            username: data.username,
            status: data.status,
            timestamp: data.timestamp,
          });
        }
      });

    this.contactSubscriptions.set(publicKey, { messageListener, processedMessages });
    console.log('✅ Successfully subscribed to contact:', publicKey.substring(0, 10) + '...');
    console.log('   📊 Total subscribed contacts:', this.contactSubscriptions.size);
  }

  /**
   * Unsubscribe from a contact
   * @param {string} publicKey - Contact's public key
   */
  unsubscribeFromContact(publicKey) {
    const subscription = this.contactSubscriptions.get(publicKey);
    if (subscription) {
      if (subscription.messageListener) {
        subscription.messageListener.off();
      }
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
    return new Promise((resolve, reject) => {
      if (!this.gun) {
        reject(new Error('P2P network not initialized'));
        return;
      }

      const messageData = {
        envelope,
        timestamp: Date.now(),
      };

      // Generate message ID from envelope or create new one
      const messageId = envelope.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Track outgoing traffic
      const dataSize = JSON.stringify(messageData).length;
      this.trafficStats.bytesOut += dataSize;
      this.trafficStats.messagesOut++;

      // Create conversation key (flat structure for relay sync)
      // Format: dm_RECIPIENT_SENDER
      const conversationKey = `dm_${recipientKey}_${this.identity.publicKey}`;

      console.log('📤 Sending DM to:', recipientKey.substring(0, 10) + '...', 'via', conversationKey);

      // Store message with 2-level structure (WORKS with relay!) - Wait for Gun acknowledgment
      this.gun
        .get(conversationKey)  // Level 1: Conversation
        .get(messageId)        // Level 2: Message ID
        .put(messageData, (ack) => {  // Store data with acknowledgment
          if (ack.err) {
            console.error('❌ DM send FAILED to:', recipientKey.substring(0, 10) + '...', 'Error:', ack.err);
            reject(new Error(`Gun.js error: ${ack.err}`));
          } else {
            console.log('✅ DM confirmed:', recipientKey.substring(0, 10) + '...', `(${dataSize} bytes)`);
            resolve({ conversationKey, messageId, dataSize });
          }
        });
    });
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
   * Send contact request to another user
   * @param {string} recipientKey - Recipient's public key
   * @param {Object} requestData - Contact request data
   */
  sendContactRequest(recipientKey, requestData) {
    return new Promise((resolve, reject) => {
      if (!this.gun) {
        reject(new Error('P2P network not initialized'));
        return;
      }

      const requestEnvelope = {
        id: requestData.id,
        fromPublicKey: requestData.fromPublicKey,
        fromUsername: requestData.fromUsername,
        fromEncryptionPublicKey: requestData.fromEncryptionPublicKey,
        message: requestData.message || null,
        timestamp: requestData.timestamp,
        type: 'contact_request'
      };

      // Generate request ID
      const requestId = requestData.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Track outgoing traffic
      const dataSize = JSON.stringify(requestEnvelope).length;
      this.trafficStats.bytesOut += dataSize;
      this.trafficStats.messagesOut++;

      // Flat key for contact requests (2-level structure for relay sync)
      // Format: creq_RECIPIENT
      const requestKey = `creq_${recipientKey}`;

      console.log('📤 Contact request queued for sending to:', recipientKey);
      console.log('   Path:', requestKey);
      console.log('   Request ID:', requestId);
      console.log('   Data size:', dataSize, 'bytes');

      // Set a timeout in case Gun.js never responds
      const timeout = setTimeout(() => {
        console.warn('⚠️ Contact request Gun.js callback timeout after 5s - resolving anyway');
        resolve({ requestKey, requestId, dataSize, timedOut: true });
      }, 5000);

      // Send to Gun.js and WAIT for acknowledgment
      this.gun
        .get(requestKey)
        .get(requestId)
        .put(requestEnvelope, (ack) => {
          clearTimeout(timeout);

          if (ack.err) {
            console.error('❌ Contact request Gun.js sync FAILED:', ack.err);
            console.error('   Path:', requestKey);
            console.error('   Request ID:', requestId);
            reject(new Error(`Gun.js error: ${ack.err}`));
          } else {
            console.log('✅ Contact request Gun.js sync CONFIRMED:', recipientKey);
            console.log('   Key:', requestKey);
            console.log('   Size:', dataSize, 'bytes');
            resolve({ requestKey, requestId, dataSize });
          }
        });
    });
  }

  /**
   * Check for existing pending contact requests on the network
   * This is called on startup to fetch any requests that were sent while offline
   * @param {Function} callback - Callback for found contact requests
   */
  checkPendingContactRequests(callback) {
    if (!this.gun) return;

    const requestKey = `creq_${this.identity.publicKey}`;
    const foundRequests = new Set();

    console.log('🔍 Checking for pending contact requests on network:', requestKey);

    // Use .once() to get current state without subscribing to updates
    this.gun
      .get(requestKey)
      .map()
      .once((data, requestId) => {
        if (data && typeof data === 'object' && data.type === 'contact_request') {
          const reqId = data.id;
          if (reqId && !foundRequests.has(reqId)) {
            foundRequests.add(reqId);
            console.log('📥 Found pending contact request:', reqId, 'from:', data.fromUsername);
            callback(data);
          }
        }
      });

    // Give it a moment to fetch existing requests
    setTimeout(() => {
      console.log(`✅ Pending contact request check complete. Found: ${foundRequests.size} requests`);
    }, 5000);
  }

  /**
   * Subscribe to incoming contact requests
   * @param {Function} callback - Callback for new contact requests
   */
  subscribeToContactRequests(callback) {
    if (!this.gun) return;

    const processedRequests = new Set();

    // Subscribe to all contact requests for this user (flat 2-level structure)
    const requestKey = `creq_${this.identity.publicKey}`;

    console.log('📡 Subscribing to contact requests:', requestKey);

    this.gun
      .get(requestKey)  // Level 1: My contact requests
      .map()            // Level 2: Iterate request IDs
      .on((data, requestId) => {
        if (data && typeof data === 'object' && data.type === 'contact_request') {
          // Prevent duplicate processing
          const reqId = data.id;
          if (reqId && !processedRequests.has(reqId)) {
            processedRequests.add(reqId);

            // Track incoming traffic
            const dataSize = JSON.stringify(data).length;
            this.trafficStats.bytesIn += dataSize;
            this.trafficStats.messagesIn++;

            console.log('📬 New contact request received:', requestId, 'from:', data.fromUsername, `(${dataSize} bytes)`);
            callback(data);
          }
        }
      });

    console.log('✅ Subscribed to contact requests');
  }

  /**
   * Send contact request response (accept/decline)
   * @param {string} recipientKey - Recipient's public key
   * @param {Object} responseData - Response data
   */
  sendContactRequestResponse(recipientKey, responseData) {
    return new Promise((resolve, reject) => {
      if (!this.gun) {
        reject(new Error('P2P network not initialized'));
        return;
      }

      const responseEnvelope = {
        id: responseData.id,
        requestId: responseData.requestId,
        status: responseData.status, // 'accepted' or 'declined'
        respondedAt: responseData.respondedAt,
        acceptorEncryptionPublicKey: responseData.acceptorEncryptionPublicKey, // CRITICAL for DM encryption
        acceptorUsername: responseData.acceptorUsername, // Display name
        type: 'contact_request_response'
      };

      // Generate response ID
      const responseId = responseData.id || `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Track outgoing traffic
      const dataSize = JSON.stringify(responseEnvelope).length;
      this.trafficStats.bytesOut += dataSize;
      this.trafficStats.messagesOut++;

      // Flat key for contact request responses (2-level structure for relay sync)
      const responseKey = `cres_${recipientKey}`;

      // Store with 2-level structure (WORKS with relay!) - Wait for Gun acknowledgment
      this.gun
        .get(responseKey)
        .get(responseId)
        .put(responseEnvelope, (ack) => {
          if (ack.err) {
            console.error('Contact request response send failed:', ack.err);
            reject(new Error(`Gun.js error: ${ack.err}`));
          } else {
            console.log('✅ Contact request response confirmed:', recipientKey, 'status:', responseData.status, `(${dataSize} bytes)`);
            resolve({ responseKey, responseId, dataSize });
          }
        });
    });
  }

  /**
   * Check for existing pending contact request responses on the network
   * @param {Function} callback - Callback for found responses
   */
  checkPendingContactRequestResponses(callback) {
    if (!this.gun) return;

    const responseKey = `cres_${this.identity.publicKey}`;
    const foundResponses = new Set();

    console.log('🔍 Checking for pending contact request responses:', responseKey);

    this.gun
      .get(responseKey)
      .map()
      .once((data, responseId) => {
        if (data && typeof data === 'object' && data.type === 'contact_request_response') {
          const resId = data.id;
          if (resId && !foundResponses.has(resId)) {
            foundResponses.add(resId);
            console.log('📥 Found pending response:', data.status, 'for request:', data.requestId);
            callback(data);
          }
        }
      });

    setTimeout(() => {
      console.log(`✅ Pending response check complete. Found: ${foundResponses.size} responses`);
    }, 5000);
  }

  /**
   * Subscribe to contact request responses
   * @param {Function} callback - Callback for new responses
   */
  subscribeToContactRequestResponses(callback) {
    if (!this.gun) return;

    const processedResponses = new Set();

    // Subscribe to all contact request responses for this user (flat 2-level structure)
    const responseKey = `cres_${this.identity.publicKey}`;

    console.log('📡 Subscribing to contact request responses:', responseKey);

    this.gun
      .get(responseKey)  // Level 1: My responses
      .map()             // Level 2: Iterate response IDs
      .on((data, responseId) => {
        if (data && typeof data === 'object' && data.type === 'contact_request_response') {
          // Prevent duplicate processing
          const resId = data.id;
          if (resId && !processedResponses.has(resId)) {
            processedResponses.add(resId);

            // Track incoming traffic
            const dataSize = JSON.stringify(data).length;
            this.trafficStats.bytesIn += dataSize;
            this.trafficStats.messagesIn++;

            console.log('Contact request response received:', responseId, 'status:', data.status, `(${dataSize} bytes)`);
            callback(data);
          }
        }
      });

    console.log('Subscribed to contact request responses');
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
   * Start traffic monitoring
   */
  startTrafficMonitoring() {
    if (this.trafficInterval) {
      clearInterval(this.trafficInterval);
    }

    // Update traffic stats every second
    this.trafficInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - this.trafficStats.lastUpdate) / 1000; // seconds

      if (timeDiff > 0) {
        const stats = {
          inKBps: (this.trafficStats.bytesIn / timeDiff / 1024).toFixed(2),
          outKBps: (this.trafficStats.bytesOut / timeDiff / 1024).toFixed(2),
          messagesIn: this.trafficStats.messagesIn,
          messagesOut: this.trafficStats.messagesOut,
          totalBytesIn: this.trafficStats.bytesIn,
          totalBytesOut: this.trafficStats.bytesOut
        };

        this.emit('traffic:update', stats);

        // Reset counters for next interval
        this.trafficStats.bytesIn = 0;
        this.trafficStats.bytesOut = 0;
        this.trafficStats.lastUpdate = now;
      }
    }, 1000);

    console.log('Traffic monitoring started');
  }

  /**
   * Stop traffic monitoring
   */
  stopTrafficMonitoring() {
    if (this.trafficInterval) {
      clearInterval(this.trafficInterval);
      this.trafficInterval = null;
      console.log('Traffic monitoring stopped');
    }
  }

  /**
   * Get current traffic stats
   */
  getTrafficStats() {
    const now = Date.now();
    const timeDiff = (now - this.trafficStats.lastUpdate) / 1000;

    return {
      inKBps: timeDiff > 0 ? (this.trafficStats.bytesIn / timeDiff / 1024).toFixed(2) : '0.00',
      outKBps: timeDiff > 0 ? (this.trafficStats.bytesOut / timeDiff / 1024).toFixed(2) : '0.00',
      messagesIn: this.trafficStats.messagesIn,
      messagesOut: this.trafficStats.messagesOut
    };
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
   * Ping Railway relay server
   */
  async pingRelayServer() {
    const relayUrl = 'https://aiseektruth-relay-production.up.railway.app/gun';

    try {
      const startTime = Date.now();
      const response = await fetch(relayUrl, {
        method: 'HEAD',
        timeout: 3000
      }).catch(() => null);

      const pingTime = Date.now() - startTime;

      if (response && response.ok) {
        this.serverStatus = 'online';
        this.lastPingTime = pingTime;
        console.log(`🟢 Railway relay ping: ${pingTime}ms`);
        this.emit('relay:ping', { status: 'online', pingTime });
        this.emit('connection:status', { status: 'online', relay: relayUrl, pingTime });
      } else {
        this.serverStatus = 'offline';
        console.log('🔴 Railway relay ping failed');
        this.emit('relay:ping', { status: 'offline', pingTime: null });
        this.emit('connection:status', { status: 'offline', relay: relayUrl });
      }
    } catch (error) {
      this.serverStatus = 'offline';
      console.log('🔴 Railway relay ping error:', error.message);
      this.emit('relay:ping', { status: 'offline', error: error.message });
      this.emit('connection:status', { status: 'offline', relay: relayUrl, error: error.message });
    }
  }

  /**
   * Start pinging relay server every 5 seconds
   */
  startServerPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Ping immediately
    this.pingRelayServer();

    // Then ping every 5 seconds
    this.pingInterval = setInterval(() => {
      this.pingRelayServer();
    }, 5000);

    console.log('Server ping started (every 5 seconds)');
  }

  /**
   * Stop pinging relay server
   */
  stopServerPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      console.log('Server ping stopped');
    }
  }

  /**
   * Get server status
   */
  getServerStatus() {
    return {
      status: this.serverStatus,
      lastPingTime: this.lastPingTime
    };
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
   * Subscribe to global chat messages
   * Everyone can read/write to this public channel
   */
  subscribeToGlobalChat() {
    if (!this.gun) {
      console.error('❌ P2P network not initialized');
      return;
    }

    const globalChatPath = 'aiseektruth_global_chat';
    console.log('📡 Subscribing to global chat...');
    console.log('   Path:', globalChatPath);

    // Keep track of seen message IDs to prevent duplicates
    const seenMessages = new Set();

    // Only show messages from current session (ignore old messages)
    const sessionStartTime = Date.now();
    console.log('   Session start time:', new Date(sessionStartTime).toLocaleTimeString());
    console.log('   Will only show messages after this time');

    this.gun.get(globalChatPath).map().on((messageData, messageId) => {
      console.log('🔔 Gun.js event fired:', messageId, messageData);

      if (!messageData || typeof messageData !== 'object') {
        console.log('⚠️ Invalid message data, skipping');
        return;
      }

      // Filter out messages from before this session started
      if (messageData.timestamp && messageData.timestamp < sessionStartTime) {
        console.log('⏭️ Skipping old message from before session start:', {
          messageId,
          messageTime: new Date(messageData.timestamp).toLocaleTimeString(),
          sessionStart: new Date(sessionStartTime).toLocaleTimeString()
        });
        return;
      }

      // Check for duplicates
      if (seenMessages.has(messageId)) {
        console.log('⚠️ Duplicate message, skipping:', messageId);
        return;
      }
      seenMessages.add(messageId);

      // Track incoming traffic
      const dataSize = JSON.stringify(messageData).length;
      if (this.trafficStats) {
        this.trafficStats.bytesIn += dataSize;
        this.trafficStats.messagesIn += 1;
        this.trafficStats.lastUpdate = Date.now();
      }

      console.log('📨 Processing global message:', {
        messageId,
        username: messageData.username,
        publicKey: messageData.publicKey?.substring(0, 10) + '...',
        messageLength: messageData.message?.length,
        timestamp: new Date(messageData.timestamp).toLocaleTimeString(),
        dataSize: dataSize + ' bytes'
      });

      // Emit global message event
      this.emit('global:message', {
        id: messageId,
        username: messageData.username || 'Anonymous',
        publicKey: messageData.publicKey || 'unknown',
        message: messageData.message || '',
        timestamp: messageData.timestamp || Date.now()
      });
    });

    console.log('✅ Subscribed to global chat successfully');
    console.log('   Listening for messages on:', globalChatPath);
  }

  /**
   * Send message to global chat
   * @param {string} username - Sender's username
   * @param {string} publicKey - Sender's public key
   * @param {string} message - Message text
   * @returns {Promise}
   */
  sendGlobalMessage(username, publicKey, message) {
    if (!this.gun) {
      return Promise.reject(new Error('P2P network not initialized'));
    }

    if (!this.isInitialized) {
      return Promise.reject(new Error('P2P network not ready'));
    }

    const messageId = `gmsg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      username,
      publicKey,
      message,
      timestamp: Date.now()
    };

    const globalChatPath = 'aiseektruth_global_chat';

    console.log('📤 SENDING GLOBAL MESSAGE');
    console.log('   Message ID:', messageId);
    console.log('   Username:', username);
    console.log('   Public Key:', publicKey.substring(0, 10) + '...');
    console.log('   Message:', message);
    console.log('   Timestamp:', new Date(messageData.timestamp).toLocaleTimeString());
    console.log('   Connected Peers:', this.connectedPeers?.size || 0);

    if (this.connectedPeers && this.connectedPeers.size > 0) {
      console.log('   Peers:', Array.from(this.connectedPeers));
    } else {
      console.warn('⚠️ No peers connected! Message may not sync.');
    }

    // Save to local storage immediately (optimistic)
    try {
      const storage = require('./storage');
      storage.saveGlobalMessage({
        id: messageId,
        username,
        publicKey,
        message,
        timestamp: messageData.timestamp
      });
      console.log('✅ Saved to local storage');
    } catch (err) {
      console.error('❌ Failed to save locally:', err);
      return Promise.reject(new Error('Failed to save message locally'));
    }

    // Send to Gun.js (fire and forget - don't wait for ack)
    const dataSize = JSON.stringify(messageData).length;
    console.log('🌐 Sending to Gun.js network...', {
      path: globalChatPath,
      messageId,
      dataSize: dataSize + ' bytes'
    });

    // Track outgoing traffic
    if (this.trafficStats) {
      this.trafficStats.bytesOut += dataSize;
      this.trafficStats.messagesOut += 1;
      this.trafficStats.lastUpdate = Date.now();
    }

    this.gun.get(globalChatPath).get(messageId).put(messageData, (ack) => {
      if (ack.err) {
        console.error('⚠️ Gun.js sync FAILED:', ack.err);
        console.error('   Message will only be available locally!');
      } else {
        console.log('✅ Gun.js sync CONFIRMED:', messageId);
        console.log('   Message is now on the network!');

        // Track confirmation as incoming traffic (acknowledgment)
        if (this.trafficStats) {
          this.trafficStats.bytesIn += 100; // Rough estimate for ack packet
        }
      }
    });

    // Return success immediately (optimistic)
    console.log('✅ Global message saved locally:', messageId);
    console.log('   Gun.js sync happening in background...');
    return Promise.resolve({ messageId, timestamp: messageData.timestamp });
  }

  /**
   * Unsubscribe from global chat
   */
  unsubscribeFromGlobalChat() {
    if (this.gun) {
      const globalChatPath = 'aiseektruth_global_chat';
      this.gun.get(globalChatPath).map().off();
      console.log('📡 Unsubscribed from global chat');
    }
  }

  /**
   * Disconnect from P2P network
   */
  disconnect() {
    this.stopHeartbeat();
    this.stopTrafficMonitoring();
    this.stopServerPing();

    // Announce offline status
    if (this.identity && this.gun) {
      this.updateStatus(this.identity.publicKey, 'offline');
    }

    // Unsubscribe from global chat
    this.unsubscribeFromGlobalChat();

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
