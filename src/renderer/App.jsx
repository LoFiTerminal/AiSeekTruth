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

      // Clean up listeners on unmount
      return () => {
        unsubscribeNewMessage();
        unsubscribeContactStatus();
        unsubscribeContactPresence();
        unsubscribeMessageDelivered();
        unsubscribeConnectionStatus();
        unsubscribeError();
      };
    }
  }, []);

  // Load contacts when authenticated
  useEffect(() => {
    const loadContacts = async () => {
      if (currentView === 'chat' && window.api) {
        const result = await window.api.getContacts();
        if (result.success) {
          setContacts(result.contacts);
        }
      }
    };

    loadContacts();
  }, [currentView, setContacts]);

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
