const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

let db = null;

/**
 * Initialize SQLite database with schema
 */
function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'aiseektruth.db');

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    -- Identity table (stores encrypted user identity)
    CREATE TABLE IF NOT EXISTS identity (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      public_key TEXT NOT NULL UNIQUE,
      encryption_public_key TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      nonce TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    -- Contacts table
    CREATE TABLE IF NOT EXISTS contacts (
      public_key TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      encryption_public_key TEXT NOT NULL,
      nickname TEXT,
      status TEXT DEFAULT 'offline',
      last_seen INTEGER,
      added_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contact_public_key TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      delivered INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0,
      signature TEXT,
      FOREIGN KEY (contact_public_key) REFERENCES contacts(public_key) ON DELETE CASCADE
    );

    -- Karma points table
    CREATE TABLE IF NOT EXISTS karma (
      public_key TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      rank TEXT DEFAULT 'Newbie',
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (public_key) REFERENCES contacts(public_key) ON DELETE CASCADE
    );

    -- Karma history table (track karma transactions)
    CREATE TABLE IF NOT EXISTS karma_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_public_key TEXT NOT NULL,
      to_public_key TEXT NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT,
      timestamp INTEGER NOT NULL
    );

    -- Groups table (Discord-style group chats)
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      avatar TEXT,
      creator_public_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Group members table
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      member_public_key TEXT NOT NULL,
      member_username TEXT NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (group_id, member_public_key),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Group messages table
    CREATE TABLE IF NOT EXISTS group_messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      sender_public_key TEXT NOT NULL,
      sender_username TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      delivered INTEGER DEFAULT 0,
      signature TEXT,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Contact requests table
    CREATE TABLE IF NOT EXISTS contact_requests (
      id TEXT PRIMARY KEY,
      from_public_key TEXT NOT NULL,
      from_username TEXT NOT NULL,
      from_encryption_public_key TEXT NOT NULL,
      to_public_key TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      message TEXT,
      timestamp INTEGER NOT NULL,
      responded_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS global_messages (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      public_key TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_public_key);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_contact_timestamp ON messages(contact_public_key, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_karma_points ON karma(points DESC);
    CREATE INDEX IF NOT EXISTS idx_karma_history_to ON karma_history(to_public_key);
    CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_messages_timestamp ON group_messages(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_group_messages_group_timestamp ON group_messages(group_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_to ON contact_requests(to_public_key);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_from ON contact_requests(from_public_key);
    CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
    CREATE INDEX IF NOT EXISTS idx_global_messages_timestamp ON global_messages(timestamp DESC);
  `);

  return db;
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) {
    initializeDatabase();
  }
  return db;
}

// ==================== IDENTITY OPERATIONS ====================

/**
 * Save encrypted identity to database
 */
function saveIdentity(encryptedIdentity) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO identity (id, username, public_key, encryption_public_key, ciphertext, nonce, salt, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    encryptedIdentity.username,
    encryptedIdentity.publicKey,
    encryptedIdentity.encryptionPublicKey,
    encryptedIdentity.ciphertext,
    encryptedIdentity.nonce,
    encryptedIdentity.salt,
    encryptedIdentity.createdAt
  );
}

/**
 * Load encrypted identity from database
 */
function loadIdentity() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT username, public_key, encryption_public_key, ciphertext, nonce, salt, created_at
    FROM identity WHERE id = 1
  `);

  const row = stmt.get();

  if (!row) return null;

  return {
    username: row.username,
    publicKey: row.public_key,
    encryptionPublicKey: row.encryption_public_key,
    ciphertext: row.ciphertext,
    nonce: row.nonce,
    salt: row.salt,
    createdAt: row.created_at,
  };
}

/**
 * Check if identity exists
 */
function identityExists() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM identity WHERE id = 1');
  const result = stmt.get();
  return result.count > 0;
}

// ==================== CONTACT OPERATIONS ====================

/**
 * Add a new contact
 */
function addContact(contact) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO contacts (public_key, username, encryption_public_key, nickname, status, last_seen, added_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    contact.publicKey,
    contact.username,
    contact.encryptionPublicKey,
    contact.nickname || null,
    contact.status || 'offline',
    contact.lastSeen || now,
    now,
    now
  );
}

/**
 * Get all contacts
 */
function getContacts() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT public_key, username, encryption_public_key, nickname, status, last_seen, added_at, updated_at
    FROM contacts
    ORDER BY username ASC
  `);

  const rows = stmt.all();

  return rows.map(row => ({
    publicKey: row.public_key,
    username: row.username,
    encryptionPublicKey: row.encryption_public_key,
    nickname: row.nickname,
    status: row.status,
    lastSeen: row.last_seen,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Update contact information
 */
function updateContact(publicKey, updates) {
  const db = getDatabase();
  const now = Date.now();

  const allowedFields = ['username', 'nickname', 'status', 'last_seen'];
  const updateFields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(dbKey)) {
      updateFields.push(`${dbKey} = ?`);
      values.push(value);
    }
  }

  if (updateFields.length === 0) return;

  updateFields.push('updated_at = ?');
  values.push(now);
  values.push(publicKey);

  const stmt = db.prepare(`
    UPDATE contacts SET ${updateFields.join(', ')} WHERE public_key = ?
  `);

  return stmt.run(...values);
}

/**
 * Delete a contact
 */
function deleteContact(publicKey) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM contacts WHERE public_key = ?');
  return stmt.run(publicKey);
}

/**
 * Get single contact
 */
function getContact(publicKey) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT public_key, username, encryption_public_key, nickname, status, last_seen, added_at, updated_at
    FROM contacts WHERE public_key = ?
  `);

  const row = stmt.get(publicKey);

  if (!row) return null;

  return {
    publicKey: row.public_key,
    username: row.username,
    encryptionPublicKey: row.encryption_public_key,
    nickname: row.nickname,
    status: row.status,
    lastSeen: row.last_seen,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

// ==================== MESSAGE OPERATIONS ====================

/**
 * Save a message
 */
function saveMessage(message) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO messages (id, contact_public_key, direction, content, timestamp, delivered, read, signature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    message.id,
    message.contactPublicKey,
    message.direction,
    message.content,
    message.timestamp,
    message.delivered ? 1 : 0,
    message.read ? 1 : 0,
    message.signature || null
  );
}

/**
 * Get messages for a contact
 */
function getMessages(contactPublicKey, limit = 50, offset = 0) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, contact_public_key, direction, content, timestamp, delivered, read, signature
    FROM messages
    WHERE contact_public_key = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(contactPublicKey, limit, offset);

  return rows.map(row => ({
    id: row.id,
    contactPublicKey: row.contact_public_key,
    direction: row.direction,
    content: row.content,
    timestamp: row.timestamp,
    delivered: row.delivered === 1,
    read: row.read === 1,
    signature: row.signature,
  }));
}

/**
 * Mark messages as read
 */
function markMessagesAsRead(messageIds) {
  if (!messageIds || messageIds.length === 0) return;

  const db = getDatabase();
  const placeholders = messageIds.map(() => '?').join(',');

  const stmt = db.prepare(`
    UPDATE messages SET read = 1 WHERE id IN (${placeholders})
  `);

  return stmt.run(...messageIds);
}

/**
 * Update message delivery status
 */
function updateMessageDelivery(messageId, delivered) {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE messages SET delivered = ? WHERE id = ?
  `);

  return stmt.run(delivered ? 1 : 0, messageId);
}

// ==================== KARMA OPERATIONS ====================

/**
 * Initialize karma for a contact
 */
function initializeKarma(publicKey, username) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO karma (public_key, username, points, rank, updated_at)
    VALUES (?, ?, 0, 'Newbie', ?)
  `);

  return stmt.run(publicKey, username, now);
}

/**
 * Add karma points
 */
function addKarmaPoints(publicKey, points, fromPublicKey, reason) {
  const db = getDatabase();
  const now = Date.now();

  // Update karma points
  const updateStmt = db.prepare(`
    UPDATE karma SET points = points + ?, updated_at = ? WHERE public_key = ?
  `);
  updateStmt.run(points, now, publicKey);

  // Record history
  const historyStmt = db.prepare(`
    INSERT INTO karma_history (from_public_key, to_public_key, points, reason, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  historyStmt.run(fromPublicKey, publicKey, points, reason, now);

  // Update rank based on new points
  updateKarmaRank(publicKey);
}

/**
 * Get karma for a user
 */
function getKarma(publicKey) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT public_key, username, points, rank, updated_at
    FROM karma WHERE public_key = ?
  `);

  const row = stmt.get(publicKey);

  if (!row) return null;

  return {
    publicKey: row.public_key,
    username: row.username,
    points: row.points,
    rank: row.rank,
    updatedAt: row.updated_at,
  };
}

/**
 * Update karma rank based on points
 */
function updateKarmaRank(publicKey) {
  const db = getDatabase();

  const karmaData = getKarma(publicKey);
  if (!karmaData) return;

  let rank = 'Newbie';
  const points = karmaData.points;

  if (points >= 10000) rank = 'Legend';
  else if (points >= 5000) rank = 'Master';
  else if (points >= 2000) rank = 'Expert';
  else if (points >= 1000) rank = 'Advanced';
  else if (points >= 500) rank = 'Intermediate';
  else if (points >= 100) rank = 'Apprentice';

  const stmt = db.prepare('UPDATE karma SET rank = ? WHERE public_key = ?');
  stmt.run(rank, publicKey);
}

/**
 * Get karma leaderboard
 */
function getKarmaLeaderboard(limit = 10) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT public_key, username, points, rank, updated_at
    FROM karma
    ORDER BY points DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit);

  return rows.map(row => ({
    publicKey: row.public_key,
    username: row.username,
    points: row.points,
    rank: row.rank,
    updatedAt: row.updated_at,
  }));
}

// ==================== GROUP OPERATIONS ====================

/**
 * Create a new group
 */
function createGroup(group) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO groups (id, name, description, avatar, creator_public_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    group.id,
    group.name,
    group.description || null,
    group.avatar || null,
    group.creatorPublicKey,
    now,
    now
  );

  // Add creator as admin
  addGroupMember(group.id, {
    publicKey: group.creatorPublicKey,
    username: group.creatorUsername,
    role: 'admin'
  });

  return { ...group, createdAt: now, updatedAt: now };
}

/**
 * Get all groups
 */
function getGroups() {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, name, description, avatar, creator_public_key, created_at, updated_at
    FROM groups
    ORDER BY updated_at DESC
  `);

  const rows = stmt.all();

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    avatar: row.avatar,
    creatorPublicKey: row.creator_public_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get a specific group
 */
function getGroup(groupId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, name, description, avatar, creator_public_key, created_at, updated_at
    FROM groups
    WHERE id = ?
  `);

  const row = stmt.get(groupId);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatar: row.avatar,
    creatorPublicKey: row.creator_public_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update group details
 */
function updateGroup(groupId, updates) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE groups
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        avatar = COALESCE(?, avatar),
        updated_at = ?
    WHERE id = ?
  `);

  return stmt.run(
    updates.name || null,
    updates.description || null,
    updates.avatar || null,
    now,
    groupId
  );
}

/**
 * Delete a group
 */
function deleteGroup(groupId) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM groups WHERE id = ?');
  return stmt.run(groupId);
}

/**
 * Add member to group
 */
function addGroupMember(groupId, member) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO group_members (group_id, member_public_key, member_username, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  return stmt.run(
    groupId,
    member.publicKey,
    member.username,
    member.role || 'member',
    now
  );
}

/**
 * Get all members of a group
 */
function getGroupMembers(groupId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT member_public_key, member_username, role, joined_at
    FROM group_members
    WHERE group_id = ?
    ORDER BY joined_at ASC
  `);

  const rows = stmt.all(groupId);

  return rows.map(row => ({
    publicKey: row.member_public_key,
    username: row.member_username,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

/**
 * Remove member from group
 */
function removeGroupMember(groupId, memberPublicKey) {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM group_members
    WHERE group_id = ? AND member_public_key = ?
  `);

  return stmt.run(groupId, memberPublicKey);
}

/**
 * Save group message
 */
function saveGroupMessage(message) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO group_messages (id, group_id, sender_public_key, sender_username, content, timestamp, delivered, signature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    message.id,
    message.groupId,
    message.senderPublicKey,
    message.senderUsername,
    message.content,
    message.timestamp,
    message.delivered ? 1 : 0,
    message.signature || null
  );
}

/**
 * Get messages for a group
 */
function getGroupMessages(groupId, limit = 50, offset = 0) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, group_id, sender_public_key, sender_username, content, timestamp, delivered, signature
    FROM group_messages
    WHERE group_id = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(groupId, limit, offset);

  return rows.map(row => ({
    id: row.id,
    groupId: row.group_id,
    senderPublicKey: row.sender_public_key,
    senderUsername: row.sender_username,
    content: row.content,
    timestamp: row.timestamp,
    delivered: row.delivered === 1,
    signature: row.signature,
  }));
}

// ==================== CONTACT REQUEST OPERATIONS ====================

/**
 * Save a contact request
 */
function saveContactRequest(request) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO contact_requests (id, from_public_key, from_username, from_encryption_public_key, to_public_key, status, message, timestamp, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    request.id,
    request.fromPublicKey,
    request.fromUsername,
    request.fromEncryptionPublicKey,
    request.toPublicKey,
    request.status || 'pending',
    request.message || null,
    request.timestamp,
    request.respondedAt || null
  );
}

/**
 * Get incoming contact requests (requests sent TO this user)
 */
function getIncomingContactRequests(publicKey, status = null) {
  const db = getDatabase();

  let query = `
    SELECT id, from_public_key, from_username, from_encryption_public_key, to_public_key, status, message, timestamp, responded_at
    FROM contact_requests
    WHERE to_public_key = ?
  `;

  const params = [publicKey];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY timestamp DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  return rows.map(row => ({
    id: row.id,
    fromPublicKey: row.from_public_key,
    fromUsername: row.from_username,
    fromEncryptionPublicKey: row.from_encryption_public_key,
    toPublicKey: row.to_public_key,
    status: row.status,
    message: row.message,
    timestamp: row.timestamp,
    respondedAt: row.responded_at,
  }));
}

/**
 * Get outgoing contact requests (requests sent FROM this user)
 */
function getOutgoingContactRequests(publicKey, status = null) {
  const db = getDatabase();

  let query = `
    SELECT id, from_public_key, from_username, from_encryption_public_key, to_public_key, status, message, timestamp, responded_at
    FROM contact_requests
    WHERE from_public_key = ?
  `;

  const params = [publicKey];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY timestamp DESC';

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  return rows.map(row => ({
    id: row.id,
    fromPublicKey: row.from_public_key,
    fromUsername: row.from_username,
    fromEncryptionPublicKey: row.from_encryption_public_key,
    toPublicKey: row.to_public_key,
    status: row.status,
    message: row.message,
    timestamp: row.timestamp,
    respondedAt: row.responded_at,
  }));
}

/**
 * Get a specific contact request by ID
 */
function getContactRequest(requestId) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT id, from_public_key, from_username, from_encryption_public_key, to_public_key, status, message, timestamp, responded_at
    FROM contact_requests
    WHERE id = ?
  `);

  const row = stmt.get(requestId);
  if (!row) return null;

  return {
    id: row.id,
    fromPublicKey: row.from_public_key,
    fromUsername: row.from_username,
    fromEncryptionPublicKey: row.from_encryption_public_key,
    toPublicKey: row.to_public_key,
    status: row.status,
    message: row.message,
    timestamp: row.timestamp,
    respondedAt: row.responded_at,
  };
}

/**
 * Update contact request status
 */
function updateContactRequestStatus(requestId, status) {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    UPDATE contact_requests
    SET status = ?, responded_at = ?
    WHERE id = ?
  `);

  return stmt.run(status, now, requestId);
}

/**
 * Delete a contact request
 */
function deleteContactRequest(requestId) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM contact_requests WHERE id = ?');
  return stmt.run(requestId);
}

/**
 * Check if contact request already exists
 */
function contactRequestExists(fromPublicKey, toPublicKey) {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM contact_requests
    WHERE from_public_key = ? AND to_public_key = ? AND status = 'pending'
  `);

  const result = stmt.get(fromPublicKey, toPublicKey);
  return result.count > 0;
}

/**
 * Save global chat message
 * @param {Object} messageData - Message data
 */
function saveGlobalMessage(messageData) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO global_messages (id, username, public_key, message, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    messageData.id,
    messageData.username,
    messageData.publicKey,
    messageData.message,
    messageData.timestamp
  );

  console.log('Global message saved:', messageData.id);
}

/**
 * Get global chat messages
 * @param {number} limit - Max number of messages
 * @returns {Array} Global messages
 */
function getGlobalMessages(limit = 100) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const stmt = db.prepare(`
    SELECT id, username, public_key as publicKey, message, timestamp
    FROM global_messages
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const messages = stmt.all(limit);
  return messages.reverse(); // Return oldest first
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  // Identity
  saveIdentity,
  loadIdentity,
  identityExists,
  // Contacts
  addContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  // Messages
  saveMessage,
  getMessages,
  markMessagesAsRead,
  updateMessageDelivery,
  // Karma
  initializeKarma,
  addKarmaPoints,
  getKarma,
  updateKarmaRank,
  getKarmaLeaderboard,
  // Groups
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  getGroupMembers,
  removeGroupMember,
  saveGroupMessage,
  getGroupMessages,
  // Contact Requests
  saveContactRequest,
  getIncomingContactRequests,
  getOutgoingContactRequests,
  getContactRequest,
  updateContactRequestStatus,
  deleteContactRequest,
  contactRequestExists,
  // Global Chat
  saveGlobalMessage,
  getGlobalMessages,
};
