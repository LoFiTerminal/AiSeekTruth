import { create } from 'zustand';

const useStore = create((set, get) => ({
  // State
  identity: null,
  isAuthenticated: false,
  contacts: [],
  activeContact: null,
  messages: {}, // { [contactPublicKey]: [...messages] }
  isConnected: false,
  currentView: 'setup', // 'setup' | 'chat'
  showAddContact: false,

  // Groups
  groups: [],
  activeGroup: null,
  groupMessages: {}, // { [groupId]: [...messages] }
  showCreateGroup: false,

  // Actions
  setIdentity: (identity) => {
    set({
      identity,
      isAuthenticated: true,
      currentView: 'chat',
    });
  },

  setContacts: (contacts) => {
    set({ contacts });
  },

  addContact: (contact) => {
    set((state) => ({
      contacts: [...state.contacts, contact],
    }));
  },

  updateContact: (publicKey, updates) => {
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.publicKey === publicKey
          ? { ...contact, ...updates }
          : contact
      ),
    }));
  },

  setActiveContact: async (contact) => {
    set({ activeContact: contact });

    // Load messages for this contact
    if (contact && window.api) {
      try {
        const result = await window.api.getMessages(contact.publicKey, 50, 0);
        if (result.success) {
          // Reverse messages to show oldest first
          const messages = result.messages.reverse();
          set((state) => ({
            messages: {
              ...state.messages,
              [contact.publicKey]: messages,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }
  },

  addMessage: (contactPublicKey, message) => {
    set((state) => {
      const currentMessages = state.messages[contactPublicKey] || [];
      return {
        messages: {
          ...state.messages,
          [contactPublicKey]: [...currentMessages, message],
        },
      };
    });
  },

  setMessages: (contactPublicKey, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [contactPublicKey]: messages,
      },
    }));
  },

  updateContactStatus: (publicKey, status) => {
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.publicKey === publicKey
          ? { ...contact, status }
          : contact
      ),
    }));
  },

  updateContactPresence: (data) => {
    const { publicKey, status, timestamp } = data;
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.publicKey === publicKey
          ? { ...contact, status, lastSeen: timestamp }
          : contact
      ),
    }));
  },

  setConnected: (isConnected) => {
    set({ isConnected });
  },

  toggleAddContact: () => {
    set((state) => ({
      showAddContact: !state.showAddContact,
    }));
  },

  markMessageDelivered: (messageId, delivered) => {
    set((state) => {
      const newMessages = { ...state.messages };

      // Find and update the message
      for (const contactKey in newMessages) {
        const contactMessages = newMessages[contactKey];
        const messageIndex = contactMessages.findIndex((m) => m.id === messageId);

        if (messageIndex !== -1) {
          newMessages[contactKey] = contactMessages.map((msg) =>
            msg.id === messageId ? { ...msg, delivered } : msg
          );
          break;
        }
      }

      return { messages: newMessages };
    });
  },

  markMessagesRead: async (contactPublicKey, messageIds) => {
    if (window.api && messageIds.length > 0) {
      await window.api.markMessagesRead(messageIds);
    }

    set((state) => {
      const contactMessages = state.messages[contactPublicKey] || [];
      const updatedMessages = contactMessages.map((msg) =>
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
      );

      return {
        messages: {
          ...state.messages,
          [contactPublicKey]: updatedMessages,
        },
      };
    });
  },

  // Group Actions
  setGroups: (groups) => {
    set({ groups });
  },

  addGroup: (group) => {
    set((state) => ({
      groups: [...state.groups, group],
    }));
  },

  setActiveGroup: async (group) => {
    set({ activeGroup: group, activeContact: null });

    // Load messages for this group
    if (group && window.api) {
      try {
        const result = await window.api.getGroupMessages(group.id, 50, 0);
        if (result.success) {
          const messages = result.messages.reverse();
          set((state) => ({
            groupMessages: {
              ...state.groupMessages,
              [group.id]: messages,
            },
          }));
        }
      } catch (error) {
        console.error('Failed to load group messages:', error);
      }
    }
  },

  addGroupMessage: (groupId, message) => {
    set((state) => {
      const currentMessages = state.groupMessages[groupId] || [];
      return {
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...currentMessages, message],
        },
      };
    });
  },

  toggleCreateGroup: () => {
    set((state) => ({
      showCreateGroup: !state.showCreateGroup,
    }));
  },
}));

export default useStore;
