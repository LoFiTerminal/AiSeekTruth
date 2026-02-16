import { useEffect } from 'react';
import useStore from './store';
import SetupWizard from './components/SetupWizard';
import ContactList from './components/ContactList';
import ChatWindow from './components/ChatWindow';

function App() {
  const {
    currentView,
    setIdentity,
    setContacts,
    addMessage,
    updateContactPresence,
    setConnected,
    markMessageDelivered,
    addContact,
    setGroups,
    addGroupMessage,
  } = useStore();

  useEffect(() => {
    // Check if identity already exists
    const checkIdentity = async () => {
      if (window.api) {
        const exists = await window.api.identityExists();
        if (!exists) {
          // No identity, stay on setup screen
          return;
        }
        // Identity exists but we need password to load it
        // For now, user will need to enter password in setup wizard
      }
    };

    checkIdentity();

    // Set up event listeners
    if (window.api) {
      // New message received
      const unsubscribeNewMessage = window.api.onNewMessage((message) => {
        console.log('New message received:', message);
        addMessage(message.contactPublicKey, message);

        // Show notification (optional - can implement later)
      });

      // Contact status update
      const unsubscribeContactStatus = window.api.onContactStatus((data) => {
        console.log('Contact status update:', data);

        if (data.type === 'discovered') {
          // Auto-discovered contact from incoming message
          addContact(data.contact);
        }
      });

      // Contact presence update
      const unsubscribeContactPresence = window.api.onContactPresence((data) => {
        console.log('Contact presence update:', data);
        updateContactPresence(data);
      });

      // Message delivered confirmation
      const unsubscribeMessageDelivered = window.api.onMessageDelivered((data) => {
        console.log('Message delivered:', data);
        markMessageDelivered(data.messageId, data.delivered);
      });

      // Connection status
      const unsubscribeConnectionStatus = window.api.onConnectionStatus((status) => {
        console.log('Connection status:', status);
        setConnected(status.status === 'online');
      });

      // Error handling
      const unsubscribeError = window.api.onError((error) => {
        console.error('Error from backend:', error);
        // Could show toast notification here
      });

      // Group message received
      const unsubscribeGroupMessage = window.api.onGroupMessage((message) => {
        console.log('New group message received:', message);
        addGroupMessage(message.groupId, message);
      });

      // Clean up listeners on unmount
      return () => {
        unsubscribeNewMessage();
        unsubscribeContactStatus();
        unsubscribeContactPresence();
        unsubscribeMessageDelivered();
        unsubscribeConnectionStatus();
        unsubscribeError();
        unsubscribeGroupMessage();
      };
    }
  }, []);

  // Load contacts and groups when authenticated
  useEffect(() => {
    const loadData = async () => {
      if (currentView === 'chat' && window.api) {
        // Load contacts
        const contactsResult = await window.api.getContacts();
        if (contactsResult.success) {
          setContacts(contactsResult.contacts);
        }

        // Load groups
        const groupsResult = await window.api.getGroups();
        if (groupsResult.success) {
          setGroups(groupsResult.groups);
        }
      }
    };

    loadData();
  }, [currentView, setContacts, setGroups]);

  if (currentView === 'setup') {
    return <SetupWizard />;
  }

  return (
    <div className="app-container">
      <ContactList />
      <ChatWindow />
    </div>
  );
}

export default App;
