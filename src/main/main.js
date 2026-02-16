const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const crypto = require('./crypto');
const storage = require('./storage');
const { getP2PInstance } = require('./p2p');
const { getMessagingInstance } = require('./messaging');

let mainWindow = null;
let currentIdentity = null;
let p2p = null;
let messaging = null;

/**
 * Create main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../../build/icons/icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#000000',
    show: false, // Show when ready to avoid flicker
  });

  // Load from Vite dev server in development, or from dist in production
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== IDENTITY HANDLERS ====================

ipcMain.handle('identity:create', async (event, username, password) => {
  try {
    const { identity, encryptedIdentity } = await crypto.createIdentity(username, password);

    // Save to database
    storage.saveIdentity(encryptedIdentity);

    // Set current identity
    currentIdentity = identity;

    // Initialize P2P and messaging
    initializeServices(identity);

    return { success: true, identity: { username, publicKey: identity.publicKey } };
  } catch (error) {
    console.error('Error creating identity:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('identity:load', async (event, password) => {
  try {
    const encryptedIdentity = storage.loadIdentity();

    if (!encryptedIdentity) {
      return { success: false, error: 'No identity found' };
    }

    const identity = await crypto.decryptIdentityFromStorage(encryptedIdentity, password);

    if (!identity) {
      return { success: false, error: 'Invalid password' };
    }

    // Set current identity
    currentIdentity = identity;

    // Initialize P2P and messaging
    initializeServices(identity);

    return { success: true, identity: { username: identity.username, publicKey: identity.publicKey } };
  } catch (error) {
    console.error('Error loading identity:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('identity:exists', async () => {
  return storage.identityExists();
});

// ==================== CONTACT HANDLERS ====================

ipcMain.handle('contacts:add', async (event, contact) => {
  try {
    storage.addContact(contact);

    // Subscribe to contact's messages
    if (messaging) {
      messaging.subscribeToContact(contact.publicKey);
    }

    // Initialize karma
    storage.initializeKarma(contact.publicKey, contact.username);

    return { success: true };
  } catch (error) {
    console.error('Error adding contact:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('contacts:get', async () => {
  try {
    const contacts = storage.getContacts();
    return { success: true, contacts };
  } catch (error) {
    console.error('Error getting contacts:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('contacts:delete', async (event, publicKey) => {
  try {
    storage.deleteContact(publicKey);
    return { success: true };
  } catch (error) {
    console.error('Error deleting contact:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('contacts:update', async (event, publicKey, updates) => {
  try {
    storage.updateContact(publicKey, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating contact:', error);
    return { success: false, error: error.message };
  }
});

// ==================== MESSAGE HANDLERS ====================

ipcMain.handle('message:send', async (event, recipientPublicKey, text) => {
  try {
    if (!messaging || !currentIdentity) {
      return { success: false, error: 'Not initialized' };
    }

    const message = await messaging.sendMessage(recipientPublicKey, text);

    return { success: true, message };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('messages:get', async (event, contactPublicKey, limit, offset) => {
  try {
    const messages = storage.getMessages(contactPublicKey, limit, offset);
    return { success: true, messages };
  } catch (error) {
    console.error('Error getting messages:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('messages:markRead', async (event, messageIds) => {
  try {
    storage.markMessagesAsRead(messageIds);
    return { success: true };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { success: false, error: error.message };
  }
});

// ==================== STATUS HANDLERS ====================

ipcMain.handle('status:update', async (event, status) => {
  try {
    if (!messaging) {
      return { success: false, error: 'Not initialized' };
    }

    messaging.updateStatus(status);
    return { success: true };
  } catch (error) {
    console.error('Error updating status:', error);
    return { success: false, error: error.message };
  }
});

// ==================== GROUP OPERATIONS ====================

ipcMain.handle('group:create', async (event, groupData) => {
  try {
    const group = storage.createGroup(groupData);
    return { success: true, group };
  } catch (error) {
    console.error('Error creating group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groups:get', async () => {
  try {
    const groups = storage.getGroups();
    return { success: true, groups };
  } catch (error) {
    console.error('Error getting groups:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:get', async (event, groupId) => {
  try {
    const group = storage.getGroup(groupId);
    return { success: true, group };
  } catch (error) {
    console.error('Error getting group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:update', async (event, groupId, updates) => {
  try {
    storage.updateGroup(groupId, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:delete', async (event, groupId) => {
  try {
    storage.deleteGroup(groupId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:addMember', async (event, groupId, member) => {
  try {
    storage.addGroupMember(groupId, member);
    return { success: true };
  } catch (error) {
    console.error('Error adding group member:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:getMembers', async (event, groupId) => {
  try {
    const members = storage.getGroupMembers(groupId);
    return { success: true, members };
  } catch (error) {
    console.error('Error getting group members:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:removeMember', async (event, groupId, memberPublicKey) => {
  try {
    storage.removeGroupMember(groupId, memberPublicKey);
    return { success: true };
  } catch (error) {
    console.error('Error removing group member:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:sendMessage', async (event, groupId, text) => {
  try {
    if (!messaging) {
      return { success: false, error: 'Not initialized' };
    }

    const message = await messaging.sendGroupMessage(groupId, text);
    return { success: true, message };
  } catch (error) {
    console.error('Error sending group message:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('group:getMessages', async (event, groupId, limit, offset) => {
  try {
    const messages = storage.getGroupMessages(groupId, limit, offset);
    return { success: true, messages };
  } catch (error) {
    console.error('Error getting group messages:', error);
    return { success: false, error: error.message };
  }
});

// ==================== SERVICE INITIALIZATION ====================

function initializeServices(identity) {
  // Initialize P2P network
  p2p = getP2PInstance();
  p2p.initialize(identity);

  // Initialize messaging service
  messaging = getMessagingInstance();
  messaging.initialize(identity);

  // Subscribe to all contacts
  messaging.subscribeToAllContacts();

  // Forward events to renderer
  messaging.on('message:received', (message) => {
    if (mainWindow) {
      mainWindow.webContents.send('message:new', message);
    }
  });

  messaging.on('group:message:received', (message) => {
    if (mainWindow) {
      mainWindow.webContents.send('group:message', message);
    }
  });

  messaging.on('contact:presence', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('contact:presence', data);
    }
  });

  messaging.on('contact:discovered', (contact) => {
    if (mainWindow) {
      mainWindow.webContents.send('contact:status', {
        type: 'discovered',
        contact,
      });
    }
  });

  messaging.on('message:sent', (message) => {
    if (mainWindow) {
      mainWindow.webContents.send('message:delivered', {
        messageId: message.id,
        delivered: message.delivered,
      });
    }
  });

  messaging.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('error', error);
    }
  });

  p2p.on('status:updated', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('connection:status', data);
    }
  });

  console.log('Services initialized');
}

// ==================== APP LIFECYCLE ====================

app.whenReady().then(() => {
  // Initialize database
  storage.initializeDatabase();

  // Create window
  createWindow();

  // Check if identity exists and try to auto-load (would need password from user)
  // For now, just show setup or login screen

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Graceful shutdown
  if (p2p) {
    p2p.disconnect();
  }

  if (messaging) {
    messaging.shutdown();
  }

  storage.closeDatabase();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Final cleanup
  if (p2p) {
    p2p.disconnect();
  }

  if (messaging) {
    messaging.shutdown();
  }

  storage.closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
