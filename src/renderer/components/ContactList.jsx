import { useState } from 'react';
import { Plus, User, Users, Hash } from 'lucide-react';
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
    groups,
    activeGroup,
    setActiveGroup,
    showCreateGroup,
    toggleCreateGroup,
    addGroup,
  } = useStore();

  const [newContact, setNewContact] = useState({
    username: '',
    publicKey: '',
    encryptionPublicKey: '',
  });
  const [addError, setAddError] = useState('');

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
  });
  const [groupError, setGroupError] = useState('');

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

  const handleCreateGroup = async () => {
    setGroupError('');

    if (!newGroup.name.trim()) {
      setGroupError('Group name is required');
      return;
    }

    try {
      const groupData = {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        creatorPublicKey: identity.publicKey,
        creatorUsername: identity.username,
      };

      const result = await window.api.createGroup(groupData);

      if (result.success) {
        addGroup(result.group);
        setNewGroup({ name: '', description: '' });
        toggleCreateGroup();
      } else {
        setGroupError(result.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setGroupError('Failed to create group');
    }
  };

  const handleContactClick = (contact) => {
    setActiveContact(contact);
  };

  const handleGroupClick = (group) => {
    setActiveGroup(group);
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

      {/* Add Buttons */}
      <div style={{ padding: '0 8px', display: 'flex', gap: '4px' }}>
        <button
          className="add-contact-btn"
          onClick={toggleAddContact}
          style={{ flex: 1, fontSize: '10px', padding: '6px 8px' }}
        >
          <Plus size={14} />
          DM
        </button>
        <button
          className="add-contact-btn"
          onClick={toggleCreateGroup}
          style={{ flex: 1, fontSize: '10px', padding: '6px 8px' }}
        >
          <Plus size={14} />
          Group
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
            <label>Encryption Key (optional)</label>
            <input
              type="text"
              value={newContact.encryptionPublicKey}
              onChange={(e) =>
                setNewContact({ ...newContact, encryptionPublicKey: e.target.value })
              }
              placeholder="Auto-derived if empty"
            />
          </div>

          {addError && <div className="form-error">{addError}</div>}

          <div className="add-contact-actions">
            <button onClick={handleAddContact}>Add</button>
            <button onClick={toggleAddContact}>Cancel</button>
          </div>
        </div>
      )}

      {/* Create Group Form */}
      {showCreateGroup && (
        <div className="add-contact-form">
          <h3>Create Group</h3>

          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              value={newGroup.name}
              onChange={(e) =>
                setNewGroup({ ...newGroup, name: e.target.value })
              }
              placeholder="My Group"
            />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <input
              type="text"
              value={newGroup.description}
              onChange={(e) =>
                setNewGroup({ ...newGroup, description: e.target.value })
              }
              placeholder="What's this group about?"
            />
          </div>

          {groupError && <div className="form-error">{groupError}</div>}

          <div className="add-contact-actions">
            <button onClick={handleCreateGroup}>Create</button>
            <button onClick={toggleCreateGroup}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contacts & Groups List */}
      <div className="contacts-scroll">
        {/* Direct Messages Section */}
        <div className="contact-section">
          <div className="contact-section-header">DIRECT MESSAGES</div>
          {contacts.length === 0 ? (
            <div className="contacts-empty">
              <p style={{ fontSize: '10px' }}>No contacts yet</p>
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
                  <User size={16} />
                  <span
                    className={`status-dot ${contact.status || 'offline'}`}
                  ></span>
                </div>

                <div className="contact-info">
                  <div className="contact-name">
                    {contact.nickname || contact.username}
                  </div>
                  <div className="contact-status">
                    {contact.status === 'online'
                      ? 'Online'
                      : formatLastSeen(contact.lastSeen)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Groups Section */}
        <div className="contact-section">
          <div className="contact-section-header">GROUPS</div>
          {groups.length === 0 ? (
            <div className="contacts-empty">
              <p style={{ fontSize: '10px' }}>No groups yet</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className={`contact-item ${
                  activeGroup?.id === group.id ? 'active' : ''
                }`}
                onClick={() => handleGroupClick(group)}
              >
                <div className="contact-avatar">
                  <Hash size={16} />
                </div>

                <div className="contact-info">
                  <div className="contact-name">{group.name}</div>
                  {group.description && (
                    <div className="contact-status">{group.description}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactList;
