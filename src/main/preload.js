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

  // Contact requests
  sendContactRequest: (recipientPublicKey, message) =>
    ipcRenderer.invoke('contact-requests:send', recipientPublicKey, message),

  getIncomingContactRequests: () =>
    ipcRenderer.invoke('contact-requests:get-incoming'),

  getOutgoingContactRequests: () =>
    ipcRenderer.invoke('contact-requests:get-outgoing'),

  acceptContactRequest: (requestId) =>
    ipcRenderer.invoke('contact-requests:accept', requestId),

  declineContactRequest: (requestId) =>
    ipcRenderer.invoke('contact-requests:decline', requestId),

  // Relay server management
  getRelayInfo: () =>
    ipcRenderer.invoke('relay:get-info'),

  addCustomRelay: (relayUrl) =>
    ipcRenderer.invoke('relay:add-custom', relayUrl),

  getCustomRelays: () =>
    ipcRenderer.invoke('relay:get-custom-relays'),

  // Messaging
  sendMessage: (recipientPublicKey, text) =>
    ipcRenderer.invoke('message:send', recipientPublicKey, text),

  getMessages: (contactPublicKey, limit = 50, offset = 0) =>
    ipcRenderer.invoke('messages:get', contactPublicKey, limit, offset),

  markMessagesRead: (messageIds) =>
    ipcRenderer.invoke('messages:markRead', messageIds),

  // Global Chat
  sendGlobalMessage: (message) =>
    ipcRenderer.invoke('global-chat:send', message),

  getGlobalMessages: (limit = 100) =>
    ipcRenderer.invoke('global-chat:get-messages', limit),

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

  onTrafficUpdate: (callback) => {
    const subscription = (event, stats) => callback(stats);
    ipcRenderer.on('traffic:update', subscription);
    return () => ipcRenderer.removeListener('traffic:update', subscription);
  },

  onRelayPing: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('relay:ping', subscription);
    return () => ipcRenderer.removeListener('relay:ping', subscription);
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

  // Contact request event listeners
  onContactRequestReceived: (callback) => {
    const subscription = (event, request) => callback(request);
    ipcRenderer.on('contact:request:received', subscription);
    return () => ipcRenderer.removeListener('contact:request:received', subscription);
  },

  onContactRequestSent: (callback) => {
    const subscription = (event, request) => callback(request);
    ipcRenderer.on('contact:request:sent', subscription);
    return () => ipcRenderer.removeListener('contact:request:sent', subscription);
  },

  onContactRequestAccepted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('contact:request:accepted', subscription);
    return () => ipcRenderer.removeListener('contact:request:accepted', subscription);
  },

  onContactRequestDeclined: (callback) => {
    const subscription = (event, request) => callback(request);
    ipcRenderer.on('contact:request:declined', subscription);
    return () => ipcRenderer.removeListener('contact:request:declined', subscription);
  },

  onContactRequestResponseAccepted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('contact:request:response:accepted', subscription);
    return () => ipcRenderer.removeListener('contact:request:response:accepted', subscription);
  },

  onContactRequestResponseDeclined: (callback) => {
    const subscription = (event, request) => callback(request);
    ipcRenderer.on('contact:request:response:declined', subscription);
    return () => ipcRenderer.removeListener('contact:request:response:declined', subscription);
  },

  // Global chat events
  onGlobalMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('global:message', subscription);
    return () => ipcRenderer.removeListener('global:message', subscription);
  },

  // Relay server events
  onRelayStarted: (callback) => {
    const subscription = (event, info) => callback(info);
    ipcRenderer.on('relay:started', subscription);
    return () => ipcRenderer.removeListener('relay:started', subscription);
  },

  // Remove all listeners for a specific channel
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Forward main process console logs to browser DevTools
ipcRenderer.on('main:log', (event, { type, args }) => {
  const prefix = '%c[MAIN]';
  const style = 'color: #00ff41; font-weight: bold;';
  
  const formattedArgs = args.map(arg => {
    try {
      return typeof arg === 'string' && (arg.startsWith('{') || arg.startsWith('[')) ? JSON.parse(arg) : arg;
    } catch {
      return arg;
    }
  });

  if (type === 'error') {
    console.error(prefix, style, ...formattedArgs);
  } else if (type === 'warn') {
    console.warn(prefix, style, ...formattedArgs);
  } else {
    console.log(prefix, style, ...formattedArgs);
  }
});
