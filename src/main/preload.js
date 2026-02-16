const { contextBridge, ipcRenderer } = require('electron');

// Secure IPC bridge - exposes limited API to renderer process
contextBridge.exposeInMainWorld('api', {
  // Identity management
  createIdentity: (username, password) =>
    ipcRenderer.invoke('identity:create', username, password),

  loadIdentity: (password) =>
    ipcRenderer.invoke('identity:load', password),

  identityExists: () =>
    ipcRenderer.invoke('identity:exists'),

  // Contact management
  addContact: (contact) =>
    ipcRenderer.invoke('contacts:add', contact),

  getContacts: () =>
    ipcRenderer.invoke('contacts:get'),

  deleteContact: (publicKey) =>
    ipcRenderer.invoke('contacts:delete', publicKey),

  updateContact: (publicKey, updates) =>
    ipcRenderer.invoke('contacts:update', publicKey, updates),

  // Messaging
  sendMessage: (recipientPublicKey, text) =>
    ipcRenderer.invoke('message:send', recipientPublicKey, text),

  getMessages: (contactPublicKey, limit = 50, offset = 0) =>
    ipcRenderer.invoke('messages:get', contactPublicKey, limit, offset),

  markMessagesRead: (messageIds) =>
    ipcRenderer.invoke('messages:markRead', messageIds),

  // Presence
  updateStatus: (status) =>
    ipcRenderer.invoke('status:update', status),

  // Group management
  createGroup: (groupData) =>
    ipcRenderer.invoke('group:create', groupData),

  getGroups: () =>
    ipcRenderer.invoke('groups:get'),

  getGroup: (groupId) =>
    ipcRenderer.invoke('group:get', groupId),

  updateGroup: (groupId, updates) =>
    ipcRenderer.invoke('group:update', groupId, updates),

  deleteGroup: (groupId) =>
    ipcRenderer.invoke('group:delete', groupId),

  addGroupMember: (groupId, member) =>
    ipcRenderer.invoke('group:addMember', groupId, member),

  getGroupMembers: (groupId) =>
    ipcRenderer.invoke('group:getMembers', groupId),

  removeGroupMember: (groupId, memberPublicKey) =>
    ipcRenderer.invoke('group:removeMember', groupId, memberPublicKey),

  sendGroupMessage: (groupId, text) =>
    ipcRenderer.invoke('group:sendMessage', groupId, text),

  getGroupMessages: (groupId, limit = 50, offset = 0) =>
    ipcRenderer.invoke('group:getMessages', groupId, limit, offset),

  // Event listeners
  onNewMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('message:new', subscription);
    return () => ipcRenderer.removeListener('message:new', subscription);
  },

  onContactStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('contact:status', subscription);
    return () => ipcRenderer.removeListener('contact:status', subscription);
  },

  onContactPresence: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('contact:presence', subscription);
    return () => ipcRenderer.removeListener('contact:presence', subscription);
  },

  onMessageDelivered: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('message:delivered', subscription);
    return () => ipcRenderer.removeListener('message:delivered', subscription);
  },

  onConnectionStatus: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('connection:status', subscription);
    return () => ipcRenderer.removeListener('connection:status', subscription);
  },

  onError: (callback) => {
    const subscription = (event, error) => callback(error);
    ipcRenderer.on('error', subscription);
    return () => ipcRenderer.removeListener('error', subscription);
  },

  onGroupMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('group:message', subscription);
    return () => ipcRenderer.removeListener('group:message', subscription);
  },

  // Remove all listeners for a specific channel
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
