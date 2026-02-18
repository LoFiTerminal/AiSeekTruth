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
      await this.p2p.sendMessageEnvelope(recipientPublicKey, envelope);

      // Update delivery status
      storage.updateMessageDelivery(messageId, true);
      message.delivered = true;

      console.log('✅ Message delivered to:', recipientPublicKey);
      this.emit('message:sent', message);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.emit('error', { type: 'send_failed', error });
    }

    return message;
  }

  /**
   * Send message to a group (Discord-style)
   * Encrypts message for each member individually
   * @param {string} groupId - Group ID
   * @param {string} text - Message text
   */
  async sendGroupMessage(groupId, text) {
    if (!this.identity) {
      throw new Error('Messaging service not initialized');
    }

    // Get group and members
    const group = storage.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const members = storage.getGroupMembers(groupId);
    if (!members || members.length === 0) {
      throw new Error('No members in group');
    }

    // Create message
    const messageId = await crypto.generateMessageId();
    const timestamp = Date.now();

    // Save to local database first
    const groupMessage = {
      id: messageId,
      groupId,
      senderPublicKey: this.identity.publicKey,
      senderUsername: this.identity.username,
      content: text,
      timestamp,
      delivered: false,
    };

    storage.saveGroupMessage(groupMessage);

    // Encrypt and send to each member (except self)
    const envelopes = [];
    for (const member of members) {
      if (member.publicKey === this.identity.publicKey) {
        continue; // Skip self
      }

      try {
        // Get shared secret with this member
        const sharedSecret = await this.getSharedSecret(member.publicKey);

        // Encrypt message
        const { ciphertext, nonce } = await crypto.encryptMessage(text, sharedSecret);

        // Create group message envelope
        const envelope = {
          id: messageId,
          from: this.identity.publicKey,
          fromUsername: this.identity.username,
          to: member.publicKey,
          groupId,
          groupName: group.name,
          ciphertext,
          nonce,
          timestamp,
          type: 'group', // Mark as group message
        };

        // Sign the envelope
        const envelopeString = JSON.stringify({
          id: envelope.id,
          from: envelope.from,
          to: envelope.to,
          groupId: envelope.groupId,
          ciphertext: envelope.ciphertext,
          nonce: envelope.nonce,
          timestamp: envelope.timestamp,
          type: envelope.type,
        });

        const signature = await crypto.signMessage(envelopeString, this.identity.privateKey);
        envelope.signature = signature;

        envelopes.push({ member: member.publicKey, envelope });
      } catch (error) {
        console.error(`Failed to encrypt for member ${member.username}:`, error);
      }
    }

    // Send all envelopes via P2P
    let successCount = 0;
    for (const { member, envelope } of envelopes) {
      try {
        await this.p2p.sendMessageEnvelope(member, envelope);
        successCount++;
        console.log(`✅ Group message delivered to: ${member}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${member}:`, error);
      }
    }

    // Update delivery status if at least one succeeded
    if (successCount > 0) {
      storage.saveGroupMessage({ ...groupMessage, delivered: true });
      groupMessage.delivered = true;
    }

    this.emit('group:message:sent', groupMessage);
    return groupMessage;
  }

  /**
   * Handle incoming message envelope
   * @param {Object} envelope - Encrypted message envelope
   */
  async handleIncomingMessage(envelope) {
    try {
      // Check if we've already processed this message (prevents duplicates)
      const existingMessages = storage.getMessages(envelope.from, 1000);
      if (existingMessages.some(m => m.id === envelope.id)) {
        console.log('Duplicate message ignored:', envelope.id);
        return;
      }

      // Check if it's a group message
      const isGroupMessage = envelope.type === 'group';

      // Verify signature
      const envelopeString = isGroupMessage
        ? JSON.stringify({
            id: envelope.id,
            from: envelope.from,
            to: envelope.to,
            groupId: envelope.groupId,
            ciphertext: envelope.ciphertext,
            nonce: envelope.nonce,
            timestamp: envelope.timestamp,
            type: envelope.type,
          })
        : JSON.stringify({
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

      if (isGroupMessage) {
        // Handle group message
        const groupMessage = {
          id: envelope.id,
          groupId: envelope.groupId,
          senderPublicKey: envelope.from,
          senderUsername: envelope.fromUsername || 'Unknown',
          content: plaintext,
          timestamp: envelope.timestamp,
          delivered: true,
          signature: envelope.signature,
        };

        storage.saveGroupMessage(groupMessage);

        // Emit event
        this.emit('group:message:received', groupMessage);

        console.log('Group message received from:', envelope.from, 'in group:', envelope.groupName);
      } else {
        // Handle direct message
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
      }
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
   * Send contact request to another user
   * @param {string} recipientPublicKey - Recipient's public key
   * @param {string} message - Optional message with the request
   * @returns {Promise<Object>} Contact request
   */
  async sendContactRequest(recipientPublicKey, message = null) {
    if (!this.identity) {
      throw new Error('Messaging service not initialized');
    }

    // Check if request already exists
    if (storage.contactRequestExists(this.identity.publicKey, recipientPublicKey)) {
      throw new Error('Contact request already sent. Please wait for them to accept or decline.');
    }

    // Check if contact already exists
    const existingContact = storage.getContact(recipientPublicKey);
    if (existingContact) {
      throw new Error('Contact already exists');
    }

    // Create contact request
    const requestId = await crypto.generateMessageId();
    const timestamp = Date.now();

    const request = {
      id: requestId,
      fromPublicKey: this.identity.publicKey,
      fromUsername: this.identity.username,
      fromEncryptionPublicKey: this.identity.encryptionPublicKey,
      toPublicKey: recipientPublicKey,
      status: 'pending',
      message,
      timestamp,
    };

    // Send via P2P network FIRST
    try {
      await this.p2p.sendContactRequest(recipientPublicKey, request);
      console.log('✅ Contact request delivered to:', recipientPublicKey);

      // Only save to local database AFTER successful P2P send
      storage.saveContactRequest(request);
      this.emit('contact:request:sent', request);
    } catch (error) {
      console.error('❌ Failed to send contact request:', error);
      this.emit('error', { type: 'contact_request_failed', error });
      throw error; // Re-throw so caller knows it failed
    }

    return request;
  }

  /**
   * Handle incoming contact request
   * @param {Object} requestData - Contact request data
   */
  async handleIncomingContactRequest(requestData) {
    try {
      console.log('Incoming contact request from:', requestData.fromPublicKey);

      // Check if request already exists
      if (storage.contactRequestExists(requestData.fromPublicKey, this.identity.publicKey)) {
        console.log('Contact request already exists');
        return;
      }

      // Check if contact already exists
      const existingContact = storage.getContact(requestData.fromPublicKey);
      if (existingContact) {
        console.log('Contact already exists');
        return;
      }

      // Save to local database
      const request = {
        id: requestData.id,
        fromPublicKey: requestData.fromPublicKey,
        fromUsername: requestData.fromUsername,
        fromEncryptionPublicKey: requestData.fromEncryptionPublicKey,
        toPublicKey: this.identity.publicKey,
        status: 'pending',
        message: requestData.message,
        timestamp: requestData.timestamp,
      };

      storage.saveContactRequest(request);

      // Emit event for UI to handle
      this.emit('contact:request:received', request);

      console.log('Contact request saved from:', requestData.fromUsername);
    } catch (error) {
      console.error('Error handling incoming contact request:', error);
      this.emit('error', { type: 'contact_request_receive_failed', error });
    }
  }

  /**
   * Accept contact request
   * @param {string} requestId - Request ID
   */
  async acceptContactRequest(requestId) {
    if (!this.identity) {
      throw new Error('Messaging service not initialized');
    }

    // Get request from database
    const request = storage.getContactRequest(requestId);
    if (!request) {
      throw new Error('Contact request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Contact request already processed');
    }

    // Update request status
    storage.updateContactRequestStatus(requestId, 'accepted');

    // Add contact to contacts list
    const contact = {
      publicKey: request.fromPublicKey,
      username: request.fromUsername,
      encryptionPublicKey: request.fromEncryptionPublicKey,
      status: 'offline',
      lastSeen: Date.now(),
    };

    storage.addContact(contact);

    // Initialize karma for contact
    storage.initializeKarma(contact.publicKey, contact.username);

    // Subscribe to contact's messages
    this.subscribeToContact(contact.publicKey);

    // Send response to requester
    try {
      const responseId = await crypto.generateMessageId();
      const response = {
        id: responseId,
        requestId,
        status: 'accepted',
        respondedAt: Date.now(),
      };

      await this.p2p.sendContactRequestResponse(request.fromPublicKey, response);
      console.log('✅ Contact request acceptance delivered:', request.fromUsername);
    } catch (error) {
      console.error('❌ Failed to send accept response:', error);
      throw error;
    }

    this.emit('contact:request:accepted', { request, contact });

    return contact;
  }

  /**
   * Decline contact request
   * @param {string} requestId - Request ID
   */
  async declineContactRequest(requestId) {
    if (!this.identity) {
      throw new Error('Messaging service not initialized');
    }

    // Get request from database
    const request = storage.getContactRequest(requestId);
    if (!request) {
      throw new Error('Contact request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Contact request already processed');
    }

    // Update request status
    storage.updateContactRequestStatus(requestId, 'declined');

    // Send response to requester
    try {
      const responseId = await crypto.generateMessageId();
      const response = {
        id: responseId,
        requestId,
        status: 'declined',
        respondedAt: Date.now(),
      };

      await this.p2p.sendContactRequestResponse(request.fromPublicKey, response);
      console.log('✅ Contact request decline delivered:', request.fromUsername);
    } catch (error) {
      console.error('❌ Failed to send decline response:', error);
      throw error;
    }

    this.emit('contact:request:declined', request);

    return request;
  }

  /**
   * Handle contact request response
   * @param {Object} responseData - Response data
   */
  async handleContactRequestResponse(responseData) {
    try {
      console.log('Contact request response received, status:', responseData.status);

      // Get the original request
      const request = storage.getContactRequest(responseData.requestId);
      if (!request) {
        console.log('Original contact request not found');
        return;
      }

      // Update request status
      storage.updateContactRequestStatus(responseData.requestId, responseData.status);

      if (responseData.status === 'accepted') {
        // Add contact to contacts list (we're the requester)
        const recipientPublicKey = request.toPublicKey;

        // Get the encryption public key from the request or derive it
        let encryptionPublicKey = request.fromEncryptionPublicKey;
        if (!encryptionPublicKey) {
          encryptionPublicKey = await crypto.getEncryptionPublicKey(recipientPublicKey);
        }

        const contact = {
          publicKey: recipientPublicKey,
          username: request.fromUsername || `User_${recipientPublicKey.substring(0, 8)}`,
          encryptionPublicKey,
          status: 'offline',
          lastSeen: Date.now(),
        };

        storage.addContact(contact);

        // Initialize karma for contact
        storage.initializeKarma(contact.publicKey, contact.username);

        // Subscribe to contact's messages
        this.subscribeToContact(contact.publicKey);

        this.emit('contact:request:response:accepted', { request, contact });
        console.log('Contact added after acceptance:', contact.username);
      } else {
        this.emit('contact:request:response:declined', request);
        console.log('Contact request was declined');
      }
    } catch (error) {
      console.error('Error handling contact request response:', error);
      this.emit('error', { type: 'contact_request_response_failed', error });
    }
  }

  /**
   * Subscribe to contact requests
   */
  subscribeToContactRequests() {
    if (!this.p2p) {
      throw new Error('P2P network not initialized');
    }

    // FIRST: Check for any pending requests that were sent while we were offline
    console.log('🔍 Checking for pending contact requests...');
    this.p2p.checkPendingContactRequests((data) => {
      console.log('📥 Processing pending contact request from:', data.fromUsername);
      this.handleIncomingContactRequest(data);
    });

    // Also check for pending responses
    this.p2p.checkPendingContactRequestResponses((data) => {
      console.log('📥 Processing pending contact response');
      this.handleContactRequestResponse(data);
    });

    // THEN: Subscribe to new incoming contact requests
    this.p2p.subscribeToContactRequests((data) => {
      console.log('📬 Processing new contact request from:', data.fromUsername);
      this.handleIncomingContactRequest(data);
    });

    // Subscribe to contact request responses
    this.p2p.subscribeToContactRequestResponses((data) => {
      console.log('📬 Processing new contact response');
      this.handleContactRequestResponse(data);
    });

    console.log('✅ Subscribed to contact requests and responses');
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
   * Subscribe to global chat
   */
  subscribeToGlobalChat() {
    if (!this.identity || !this.p2p) {
      throw new Error('Messaging service not initialized');
    }

    // Subscribe to global chat messages
    this.p2p.subscribeToGlobalChat();

    // Listen for incoming global messages
    this.p2p.on('global:message', (messageData) => {
      console.log('📨 Global message received:', messageData.username);

      // Emit to UI
      this.emit('global:message', messageData);

      // Store in local storage for history
      try {
        storage.saveGlobalMessage(messageData);
      } catch (error) {
        console.error('Failed to save global message:', error);
      }
    });

    console.log('✅ Subscribed to global chat');
  }

  /**
   * Send message to global chat
   * @param {string} message - Message text
   * @returns {Promise<Object>} Message result
   */
  async sendGlobalMessage(message) {
    if (!this.identity || !this.p2p) {
      throw new Error('Messaging service not initialized');
    }

    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      const result = await this.p2p.sendGlobalMessage(
        this.identity.username,
        this.identity.publicKey,
        message.trim()
      );

      console.log('✅ Global message sent');
      return result;
    } catch (error) {
      console.error('❌ Failed to send global message:', error);
      throw error;
    }
  }

  /**
   * Get global chat messages from local storage
   * @param {number} limit - Max number of messages to return
   * @returns {Array} Global messages
   */
  getGlobalMessages(limit = 100) {
    try {
      return storage.getGlobalMessages(limit);
    } catch (error) {
      console.error('Failed to get global messages:', error);
      return [];
    }
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
