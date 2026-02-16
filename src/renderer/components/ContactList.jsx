import { useState } from 'react';
import { Plus, User } from 'lucide-react';
import useStore from '../store';

function ContactList() {
  const {
    identity,
    contacts,
    activeContact,
    setActiveContact,
    showAddContact,
    toggleAddContact,
    addContact,
  } = useStore();

  const [newContact, setNewContact] = useState({
    username: '',
    publicKey: '',
    encryptionPublicKey: '',
  });
  const [addError, setAddError] = useState('');

  const handleAddContact = async () => {
    setAddError('');

    if (!newContact.username.trim() || !newContact.publicKey.trim()) {
      setAddError('Username and public key are required');
      return;
    }

    try {
      const contactData = {
        username: newContact.username.trim(),
        publicKey: newContact.publicKey.trim(),
        encryptionPublicKey: newContact.encryptionPublicKey.trim() || newContact.publicKey.trim(),
        status: 'offline',
        lastSeen: Date.now(),
      };

      const result = await window.api.addContact(contactData);

      if (result.success) {
        addContact(contactData);
        setNewContact({ username: '', publicKey: '', encryptionPublicKey: '' });
        toggleAddContact();
      } else {
        setAddError(result.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      setAddError('Failed to add contact');
    }
  };

  const handleContactClick = (contact) => {
    setActiveContact(contact);
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="contact-list">
      {/* User Info */}
      <div className="user-info">
        <div className="user-name">{identity?.username || 'User'}</div>
        <div className="user-key">
          {identity?.publicKey
            ? `${identity.publicKey.substring(0, 16)}...${identity.publicKey.substring(
                identity.publicKey.length - 16
              )}`
            : ''}
        </div>
      </div>

      {/* Add Contact Button */}
      <div style={{ padding: '0 15px' }}>
        <button className="add-contact-btn" onClick={toggleAddContact}>
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      {/* Add Contact Form */}
      {showAddContact && (
        <div className="add-contact-form">
          <h3>Add New Contact</h3>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={newContact.username}
              onChange={(e) =>
                setNewContact({ ...newContact, username: e.target.value })
              }
              placeholder="Contact's username"
            />
          </div>

          <div className="form-group">
            <label>Public Key</label>
            <input
              type="text"
              value={newContact.publicKey}
              onChange={(e) =>
                setNewContact({ ...newContact, publicKey: e.target.value })
              }
              placeholder="Contact's public key"
            />
          </div>

          <div className="form-group">
            <label>Encryption Public Key (optional)</label>
            <input
              type="text"
              value={newContact.encryptionPublicKey}
              onChange={(e) =>
                setNewContact({ ...newContact, encryptionPublicKey: e.target.value })
              }
              placeholder="Leave blank to derive from public key"
            />
          </div>

          {addError && <div className="form-error">{addError}</div>}

          <div className="add-contact-actions">
            <button onClick={handleAddContact}>Add</button>
            <button onClick={toggleAddContact}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="contacts-scroll">
        {contacts.length === 0 ? (
          <div className="contacts-empty">
            <p>No contacts yet.</p>
            <p>Add your first contact to start chatting!</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.publicKey}
              className={`contact-item ${
                activeContact?.publicKey === contact.publicKey ? 'active' : ''
              }`}
              onClick={() => handleContactClick(contact)}
            >
              <div className="contact-avatar">
                <User size={20} />
              </div>

              <div className="contact-info">
                <div className="contact-name">
                  {contact.nickname || contact.username}
                </div>
                <div className="contact-status">
                  <span
                    className={`status-dot ${contact.status || 'offline'}`}
                  ></span>
                  {contact.status === 'online'
                    ? 'Online'
                    : formatLastSeen(contact.lastSeen)}
                </div>
              </div>

              {/* Unread badge - implement later with message count */}
              {/* <div className="unread-badge">3</div> */}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ContactList;
