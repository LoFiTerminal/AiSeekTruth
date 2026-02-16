const EventEmitter = require('events');
const crypto = require('./crypto');
const storage = require('./storage');
const { getP2PInstance } = require('./p2p');

class MessagingService extends EventEmitter {
  constructor() {
    super();
    this.identity = null;
    this.sharedSecretCache = new Map(); // Cache for ECDH shared secrets
    this.p2p = null;
  }

  /**
   * Initialize messaging service
   * @param {Object} identity - User's identity
   */
  initialize(identity) {
    this.identity = identity;
    this.p2p = getP2PInstance();

    // Subscribe to incoming messages from P2P network
    this.p2p.on('presence:update', (data) => {
      this.emit('contact:presence', data);

      // Update contact status in database
      storage.updateContact(data.publicKey, {
        status: data.status,
        lastSeen: data.timestamp,
      });
    });

    console.log('Messaging service initialized for:', identity.username);
  }

  /**
   * Get or compute shared secret with a contact
   * @param {string} contactPublicKey - Contact's public key
   * @returns {Promise<Uint8Array>} Shared secret
   */
  async getSharedSecret(contactPublicKey) {
    // Check cache first
    if (this.sharedSecretCache.has(contactPublicKey)) {
      return this.sharedSecretCache.get(contactPublicKey);
    }

    // Get contact's encryption public key
    const contact = storage.getContact(contactPublicKey);
    if (!contact) {
      throw new Error('Contact not found');
    }

    // Derive shared secret using ECDH
    const sharedSecret = await crypto.deriveSharedSecret(
      this.identity.encryptionPrivateKey,
      contact.encryptionPublicKey
    );

    // Cache the shared secret
    this.sharedSecretCache.set(contactPublicKey, sharedSecret);

    return sharedSecret;
  }

  /**
   * Send encrypted message to a contact
   * @param {string} recipientPublicKey - Recipient's public key
   * @param {string} text - Message text
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(recipientPublicKey, text) {
    if (!this.identity) {
      throw new Error('Messaging service not initialized');
    }

    // Get shared secret
    const sharedSecret = await this.getSharedSecret(recipientPublicKey);

    // Encrypt message
    const { ciphertext, nonce } = await crypto.encryptMessage(text, sharedSecret);

    // Create message envelope
    const messageId = await crypto.generateMessageId();
    const timestamp = Date.now();

    const envelope = {
      id: messageId,
      from: this.identity.publicKey,
      to: recipientPublicKey,
      ciphertext,
      nonce,
      timestamp,
    };

    // Sign the envelope
    const envelopeString = JSON.stringify({
      id: envelope.id,
      from: envelope.from,
      to: envelope.to,
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
      timestamp: envelope.timestamp,
    });

    const signature = await crypto.signMessage(envelopeString, this.identity.privateKey);
    envelope.signature = signature;

    // Save to local database
    const message = {
      id: messageId,
      contactPublicKey: recipientPublicKey,
      direction: 'sent',
      content: text,
      timestamp,
      delivered: false,
      read: false,
      signature,
    };

    storage.saveMessage(message);

    // Send via P2P network
    try {
      this.p2p.sendMessageEnvelope(recipientPublicKey, envelope);

      // Update delivery status
      storage.updateMessageDelivery(messageId, true);
      message.delivered = true;

      this.emit('message:sent', message);
    } catch (error) {
      console.error('Failed to send message:', error);
      this.emit('error', { type: 'send_failed', error });
    }

    return message;
  }

  /**
   * Handle incoming message envelope
   * @param {Object} envelope - Encrypted message envelope
   */
  async handleIncomingMessage(envelope) {
    try {
      // Verify signature
      const envelopeString = JSON.stringify({
        id: envelope.id,
        from: envelope.from,
        to: envelope.to,
        ciphertext: envelope.ciphertext,
        nonce: envelope.nonce,
        timestamp: envelope.timestamp,
      });

      const isValid = await crypto.verifySignature(
        envelopeString,
        envelope.signature,
        envelope.from
      );

      if (!isValid) {
        console.error('Invalid message signature from:', envelope.from);
        return;
      }

      // Check if contact exists, if not add them
      let contact = storage.getContact(envelope.from);
      if (!contact) {
        // Auto-discover contact from message
        const encryptionPublicKey = await crypto.getEncryptionPublicKey(envelope.from);

        contact = {
          publicKey: envelope.from,
          username: 'Unknown User', // Will be updated when user adds proper contact
          encryptionPublicKey,
          status: 'online',
          lastSeen: Date.now(),
        };

        storage.addContact(contact);
        this.emit('contact:discovered', contact);
      }

      // Get shared secret
      const sharedSecret = await this.getSharedSecret(envelope.from);

      // Decrypt message
      const plaintext = await crypto.decryptMessage(
        envelope.ciphertext,
        envelope.nonce,
        sharedSecret
      );

      if (!plaintext) {
        console.error('Failed to decrypt message from:', envelope.from);
        return;
      }

      // Save to database
      const message = {
        id: envelope.id,
        contactPublicKey: envelope.from,
        direction: 'received',
        content: plaintext,
        timestamp: envelope.timestamp,
        delivered: true,
        read: false,
        signature: envelope.signature,
      };

      storage.saveMessage(message);

      // Emit event
      this.emit('message:received', message);

      console.log('Message received from:', envelope.from);
    } catch (error) {
      console.error('Error handling incoming message:', error);
      this.emit('error', { type: 'receive_failed', error });
    }
  }

  /**
   * Subscribe to contact's messages
   * @param {string} contactPublicKey - Contact's public key
   */
  subscribeToContact(contactPublicKey) {
    if (!this.p2p) {
      throw new Error('P2P network not initialized');
    }

    this.p2p.subscribeToContact(contactPublicKey, (data) => {
      if (data.envelope) {
        this.handleIncomingMessage(data.envelope);
      }
    });
  }

  /**
   * Subscribe to all contacts
   */
  subscribeToAllContacts() {
    const contacts = storage.getContacts();

    for (const contact of contacts) {
      this.subscribeToContact(contact.publicKey);
    }

    console.log(`Subscribed to ${contacts.length} contacts`);
  }

  /**
   * Update user status
   * @param {string} status - New status (online/away/busy)
   */
  updateStatus(status) {
    if (!this.identity || !this.p2p) {
      throw new Error('Messaging service not initialized');
    }

    this.p2p.updateStatus(this.identity.publicKey, status);
  }

  /**
   * Clear shared secret cache
   */
  clearCache() {
    this.sharedSecretCache.clear();
    console.log('Shared secret cache cleared');
  }

  /**
   * Shutdown messaging service
   */
  shutdown() {
    this.clearCache();
    this.removeAllListeners();
    console.log('Messaging service shutdown');
  }
}

// Singleton instance
let messagingInstance = null;

function getMessagingInstance() {
  if (!messagingInstance) {
    messagingInstance = new MessagingService();
  }
  return messagingInstance;
}

module.exports = {
  getMessagingInstance,
  MessagingService,
};
