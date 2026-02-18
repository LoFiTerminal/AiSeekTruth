import { useState, useEffect } from 'react';
import { Plus, User, Users, Hash, Settings, Trash2, X, Info } from 'lucide-react';
import useStore from '../store';
import Profile from './Profile';
import ContactInfo from './ContactInfo';
import ConnectionStatus from './ConnectionStatus';

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

  const [showProfile, setShowProfile] = useState(false);
  const [selectedContactInfo, setSelectedContactInfo] = useState(null);
  const [avatarColor, setAvatarColor] = useState(
    localStorage.getItem('avatarColor') || 'linear-gradient(135deg, #00ff41 0%, #00ffff 100%)'
  );
  const [userStatus, setUserStatus] = useState(
    localStorage.getItem('userStatus') || 'online'
  );

  // Listen for avatar color and status changes
  useEffect(() => {
    const handleAvatarChange = () => {
      setAvatarColor(localStorage.getItem('avatarColor') || 'linear-gradient(135deg, #00ff41 0%, #00ffff 100%)');
    };
    const handleStatusChange = () => {
      setUserStatus(localStorage.getItem('userStatus') || 'online');
    };

    window.addEventListener('avatarColorChanged', handleAvatarChange);
    window.addEventListener('userStatusChanged', handleStatusChange);

    return () => {
      window.removeEventListener('avatarColorChanged', handleAvatarChange);
      window.removeEventListener('userStatusChanged', handleStatusChange);
    };
  }, []);

  // Load contact requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const incoming = await window.api.getIncomingContactRequests();
        const outgoing = await window.api.getOutgoingContactRequests();

        if (incoming.success) {
          // Filter only pending requests
          setIncomingRequests(incoming.requests.filter(r => r.status === 'pending'));
        }

        if (outgoing.success) {
          // Filter only pending requests
          setOutgoingRequests(outgoing.requests.filter(r => r.status === 'pending'));
        }
      } catch (error) {
        console.error('Error loading contact requests:', error);
      }
    };

    loadRequests();

    // Subscribe to contact request events
    const unsubReceived = window.api.onContactRequestReceived((request) => {
      setIncomingRequests(prev => [request, ...prev]);
    });

    const unsubSent = window.api.onContactRequestSent((request) => {
      setOutgoingRequests(prev => [request, ...prev]);
    });

    const unsubAccepted = window.api.onContactRequestAccepted(({ request, contact }) => {
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
      addContact(contact);
    });

    const unsubDeclined = window.api.onContactRequestDeclined((request) => {
      setIncomingRequests(prev => prev.filter(r => r.id !== request.id));
    });

    const unsubResponseAccepted = window.api.onContactRequestResponseAccepted(({ request, contact }) => {
      setOutgoingRequests(prev => prev.filter(r => r.id !== request.id));
      addContact(contact);
    });

    const unsubResponseDeclined = window.api.onContactRequestResponseDeclined((request) => {
      setOutgoingRequests(prev => prev.filter(r => r.id !== request.id));
    });

    return () => {
      unsubReceived();
      unsubSent();
      unsubAccepted();
      unsubDeclined();
      unsubResponseAccepted();
      unsubResponseDeclined();
    };
  }, []);

  const [newContact, setNewContact] = useState({
    username: '',
    publicKey: '',
    encryptionPublicKey: '',
    message: '',
  });
  const [addError, setAddError] = useState('');

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
  });
  const [groupError, setGroupError] = useState('');

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);

  const handleAddContact = async () => {
    setAddError('');

    if (!newContact.publicKey.trim()) {
      setAddError('Public key is required');
      return;
    }

    // Prevent adding yourself
    if (newContact.publicKey.trim() === identity?.publicKey) {
      setAddError('You cannot add yourself as a contact');
      return;
    }

    // Check if contact already exists
    if (contacts.some(c => c.publicKey === newContact.publicKey.trim())) {
      setAddError('This contact already exists');
      return;
    }

    // Check if request already sent
    if (outgoingRequests.some(r => r.toPublicKey === newContact.publicKey.trim())) {
      setAddError('Contact request already sent');
      return;
    }

    try {
      const result = await window.api.sendContactRequest(
        newContact.publicKey.trim(),
        newContact.message.trim() || null
      );

      if (result.success) {
        setNewContact({ username: '', publicKey: '', encryptionPublicKey: '', message: '' });
        toggleAddContact();
      } else {
        setAddError(result.error || 'Failed to send contact request');
      }
    } catch (error) {
      console.error('Error sending contact request:', error);
      setAddError('Failed to send contact request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const result = await window.api.acceptContactRequest(requestId);
      if (result.success) {
        console.log('Contact request accepted');
      } else {
        alert(result.error || 'Failed to accept contact request');
      }
    } catch (error) {
      console.error('Error accepting contact request:', error);
      alert('Failed to accept contact request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const result = await window.api.declineContactRequest(requestId);
      if (result.success) {
        console.log('Contact request declined');
      } else {
        alert(result.error || 'Failed to decline contact request');
      }
    } catch (error) {
      console.error('Error declining contact request:', error);
      alert('Failed to decline contact request');
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

  const handleContactDoubleClick = (contact, e) => {
    e.stopPropagation();
    setSelectedContactInfo(contact);
  };

  const handleGroupClick = (group) => {
    setActiveGroup(group);
  };

  const handleDeleteContact = async (contact, e) => {
    e.stopPropagation();

    if (confirm(`Delete ${contact.username}? This will remove all message history.`)) {
      try {
        await window.api.deleteContact(contact.publicKey);
        // Remove from store
        useStore.setState(state => ({
          contacts: state.contacts.filter(c => c.publicKey !== contact.publicKey),
          activeContact: state.activeContact?.publicKey === contact.publicKey ? null : state.activeContact,
        }));
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Failed to delete contact');
      }
    }
  };

  const handleDeleteGroup = async (group, e) => {
    e.stopPropagation();

    if (confirm(`Delete group "${group.name}"? This will remove all message history.`)) {
      try {
        await window.api.deleteGroup(group.id);
        // Remove from store
        useStore.setState(state => ({
          groups: state.groups.filter(g => g.id !== group.id),
          activeGroup: state.activeGroup?.id === group.id ? null : state.activeGroup,
        }));
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group');
      }
    }
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
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}

      {selectedContactInfo && (
        <ContactInfo
          contact={selectedContactInfo}
          onClose={() => setSelectedContactInfo(null)}
          onUpdate={(updatedContact) => {
            // Update the contact in the store
            useStore.setState(state => ({
              contacts: state.contacts.map(c =>
                c.publicKey === updatedContact.publicKey ? updatedContact : c
              ),
            }));
          }}
          onDelete={async () => {
            await handleDeleteContact(selectedContactInfo, { stopPropagation: () => {} });
          }}
        />
      )}

      {/* User Info */}
      <div className="user-info">
        <div className="user-avatar" style={{ background: avatarColor, position: 'relative' }}>
          {identity?.username ? identity.username.substring(0, 2).toUpperCase() : 'U'}
          <span
            className={`status-dot ${userStatus}`}
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '3px solid var(--bg-tertiary)',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{identity?.username || 'User'}</div>
          <div className="user-key">
            {identity?.publicKey
              ? `${identity.publicKey.substring(0, 12)}...${identity.publicKey.substring(
                  identity.publicKey.length - 4
                )}`
              : ''}
          </div>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="secondary"
          style={{
            padding: '6px',
            minHeight: 'auto',
          }}
          title="View Profile & Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Add Buttons */}
      <div style={{ padding: '12px', display: 'flex', gap: '8px' }}>
        <button
          className="add-contact-btn"
          onClick={toggleAddContact}
          style={{ flex: 1 }}
        >
          <Plus size={16} />
          DM
        </button>
        <button
          className="add-contact-btn"
          onClick={toggleCreateGroup}
          style={{ flex: 1 }}
        >
          <Plus size={16} />
          Group
        </button>
      </div>

      {/* Add Contact Form */}
      {showAddContact && (
        <div className="add-contact-form">
          <h3>Send Contact Request</h3>

          <div style={{
            background: 'rgba(0, 255, 65, 0.05)',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '16px',
            fontSize: '13px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: 'var(--terminal-green)', display: 'block', marginBottom: '12px', fontSize: '14px' }}>
              📋 How to Connect:
            </strong>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>
                Click the <Settings size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> button above
              </li>
              <li style={{ marginBottom: '8px' }}>
                Copy your <strong>Public Key</strong> and share it with your friend
              </li>
              <li style={{ marginBottom: '8px' }}>
                Get their <strong>public key</strong> from them
              </li>
              <li style={{ marginBottom: '8px' }}>
                Paste their <strong>public key</strong> below and send request
              </li>
              <li>
                Once accepted, start chatting! 🚀
              </li>
            </ol>
          </div>

          <div className="form-group">
            <label>Username (optional)</label>
            <input
              type="text"
              value={newContact.username}
              onChange={(e) => {
                setNewContact({ ...newContact, username: e.target.value });
                if (addError) setAddError(''); // Clear error on input
              }}
              placeholder="Leave blank to auto-generate"
            />
          </div>

          <div className="form-group">
            <label>Public Key *</label>
            <input
              type="text"
              value={newContact.publicKey}
              onChange={(e) => {
                setNewContact({ ...newContact, publicKey: e.target.value });
                if (addError) setAddError(''); // Clear error on input
              }}
              placeholder="Contact's public key"
            />
          </div>

          <div className="form-group">
            <label>Message (optional)</label>
            <input
              type="text"
              value={newContact.message}
              onChange={(e) =>
                setNewContact({ ...newContact, message: e.target.value })
              }
              placeholder="Say hi!"
            />
          </div>

          {addError && (
            <div className="form-error" style={{ position: 'relative' }}>
              <button
                onClick={() => setAddError('')}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--status-dnd)',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '18px',
                  lineHeight: '1',
                  minHeight: 'auto',
                }}
                title="Dismiss"
              >
                ×
              </button>
              {addError}
            </div>
          )}

          <div className="add-contact-actions">
            <button className="primary" onClick={handleAddContact}>Send Request</button>
            <button className="secondary" onClick={toggleAddContact}>Cancel</button>
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

          {groupError && (
            <div className="form-error" style={{ position: 'relative' }}>
              <button
                onClick={() => setGroupError('')}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--status-dnd)',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '18px',
                  lineHeight: '1',
                  minHeight: 'auto',
                }}
                title="Dismiss"
              >
                ×
              </button>
              {groupError}
            </div>
          )}

          <div className="add-contact-actions">
            <button className="primary" onClick={handleCreateGroup}>Create Group</button>
            <button className="secondary" onClick={toggleCreateGroup}>Cancel</button>
          </div>
        </div>
      )}

      {/* Contact Requests Section */}
      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-secondary)' }}>
          <div
            onClick={() => setShowRequests(!showRequests)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px',
              background: 'rgba(0, 255, 65, 0.05)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 255, 65, 0.2)',
            }}
          >
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--terminal-green)',
            }}>
              📬 Contact Requests ({incomingRequests.length} incoming, {outgoingRequests.length} pending)
            </div>
            <div style={{ color: 'var(--terminal-green)' }}>
              {showRequests ? '▼' : '▶'}
            </div>
          </div>

          {showRequests && (
            <div style={{ marginTop: '12px' }}>
              {/* Incoming Requests */}
              {incomingRequests.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Incoming
                  </div>
                  {incomingRequests.map((request) => (
                    <div
                      key={request.id}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}>
                        <div className="contact-avatar" style={{ width: '32px', height: '32px' }}>
                          <User size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                          }}>
                            {request.fromUsername}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            fontFamily: "'Courier New', monospace",
                          }}>
                            {request.fromPublicKey.substring(0, 16)}...
                          </div>
                        </div>
                      </div>
                      {request.message && (
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          marginBottom: '8px',
                          padding: '8px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '4px',
                          fontStyle: 'italic',
                        }}>
                          "{request.message}"
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: 'var(--terminal-green)',
                            color: 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-secondary)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Outgoing Requests */}
              {outgoingRequests.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Pending
                  </div>
                  {outgoingRequests.map((request) => (
                    <div
                      key={request.id}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        opacity: 0.7,
                      }}
                    >
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}>
                        Waiting for response...
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        fontFamily: "'Courier New', monospace",
                        marginTop: '4px',
                      }}>
                        {request.toPublicKey.substring(0, 16)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contacts & Groups List */}
      <div className="contacts-scroll">
        {/* Direct Messages Section */}
        <div className="contact-section">
          <div className="contact-section-header">DIRECT MESSAGES</div>
          {contacts.length === 0 ? (
            <div className="contacts-empty">
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                lineHeight: '1.6',
              }}>
                <User size={48} style={{ opacity: 0.3, marginBottom: '12px', color: 'var(--terminal-green)' }} />
                <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  No contacts yet
                </p>
                <p style={{ fontSize: '12px', marginBottom: '16px' }}>
                  Click <strong style={{ color: 'var(--terminal-green)' }}>+ DM</strong> above to add your first contact
                </p>
                <div style={{
                  background: 'rgba(0, 255, 65, 0.05)',
                  border: '1px solid rgba(0, 255, 65, 0.2)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '11px',
                  textAlign: 'left',
                }}>
                  <strong style={{ color: 'var(--terminal-green)', display: 'block', marginBottom: '6px' }}>
                    Quick Start:
                  </strong>
                  <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
                    1. Get your public key from <Settings size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> Settings<br />
                    2. Share it with a friend<br />
                    3. Get their key and add them
                  </div>
                </div>
              </div>
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.publicKey}
                className={`contact-item ${
                  activeContact?.publicKey === contact.publicKey ? 'active' : ''
                }`}
                onClick={() => handleContactClick(contact)}
                onDoubleClick={(e) => handleContactDoubleClick(contact, e)}
                style={{ position: 'relative' }}
                title="Double-click for contact info"
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

                <div style={{
                  position: 'absolute',
                  right: '8px',
                  display: 'flex',
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }} className="contact-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContactInfo(contact);
                    }}
                    className="contact-action-btn"
                    title="Contact info"
                    style={{
                      padding: '4px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--terminal-green)',
                      borderRadius: '4px',
                      color: 'var(--terminal-green)',
                      cursor: 'pointer',
                    }}
                  >
                    <Info size={14} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteContact(contact, e)}
                    className="contact-action-btn"
                    title="Delete contact"
                    style={{
                      padding: '4px',
                      background: 'var(--status-dnd)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
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
                style={{ position: 'relative' }}
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

                <button
                  onClick={(e) => handleDeleteGroup(group, e)}
                  className="contact-delete-btn"
                  title="Delete group"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    padding: '4px',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    background: 'var(--status-dnd)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Connection Status Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-secondary)',
        background: 'var(--bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontFamily: "'Courier New', monospace",
        }}>
          E2E ENCRYPTED
        </div>
        <ConnectionStatus />
      </div>
    </div>
  );
}

export default ContactList;
