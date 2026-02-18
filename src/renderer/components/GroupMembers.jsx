import { useState, useEffect } from 'react';
import { User, UserPlus, UserMinus, Crown, X } from 'lucide-react';
import useStore from '../store';

function GroupMembers({ group }) {
  const { contacts, identity } = useStore();
  const [members, setMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedContact, setSelectedContact] = useState('');

  // Load group members
  useEffect(() => {
    if (group) {
      loadMembers();
    }
  }, [group]);

  const loadMembers = async () => {
    try {
      const result = await window.api.getGroupMembers(group.id);
      if (result.success) {
        setMembers(result.members);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedContact) return;

    try {
      const contact = contacts.find(c => c.publicKey === selectedContact);
      if (!contact) return;

      const memberData = {
        publicKey: contact.publicKey,
        username: contact.username,
        role: 'member',
      };

      const result = await window.api.addGroupMember(group.id, memberData);

      if (result.success) {
        await loadMembers();
        setSelectedContact('');
        setShowAddMember(false);
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (memberPublicKey) => {
    if (!confirm('Remove this member from the group?')) return;

    try {
      const result = await window.api.removeGroupMember(group.id, memberPublicKey);

      if (result.success) {
        await loadMembers();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const result = await window.api.removeGroupMember(group.id, identity.publicKey);

      if (result.success) {
        // Group left successfully, UI will update via store
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const isAdmin = members.find(m => m.publicKey === identity?.publicKey)?.role === 'admin';
  const isCreator = group.creatorPublicKey === identity?.publicKey;

  // Get contacts not in group
  const availableContacts = contacts.filter(
    contact => !members.find(m => m.publicKey === contact.publicKey)
  );

  return (
    <div className="group-members-panel">
      {/* Header with Admin Controls */}
      <div className="group-members-header">
        <h3>Members ({members.length})</h3>

        {/* Admin Add Member Button at Top */}
        {isAdmin && availableContacts.length > 0 && (
          <button
            className="add-member-button"
            onClick={() => setShowAddMember(!showAddMember)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '600',
              marginTop: '12px'
            }}
          >
            <UserPlus size={14} />
            Add Member
          </button>
        )}
      </div>

      {/* Add Member Form */}
      {showAddMember && (
        <div className="add-member-form" style={{ padding: '12px' }}>
          <select
            value={selectedContact}
            onChange={(e) => setSelectedContact(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          >
            <option value="">Select a contact...</option>
            {availableContacts.map(contact => (
              <option key={contact.publicKey} value={contact.publicKey}>
                {contact.nickname || contact.username}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={handleAddMember} disabled={!selectedContact}>
              Add
            </button>
            <button onClick={() => setShowAddMember(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members List - Scrollable */}
      <div className="group-members-list" style={{ flex: 1, overflowY: 'auto' }}>
        {members.map(member => {
          const isMe = member.publicKey === identity?.publicKey;
          const canRemove = isAdmin && !isMe && member.role !== 'admin';

          // Get member's avatar image from localStorage if it's the current user
          const memberAvatarImage = isMe ? localStorage.getItem('avatarImage') : null;
          const memberAvatarColor = isMe
            ? (localStorage.getItem('avatarColor') || 'linear-gradient(135deg, #00ff41 0%, #00ffff 100%)')
            : 'linear-gradient(135deg, #00ff41 0%, #00ffff 100%)';

          return (
            <div key={member.publicKey} className="group-member-item">
              <div className="member-avatar" style={{
                ...(memberAvatarImage ? {
                  backgroundImage: `url(${memberAvatarImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                } : {
                  backgroundImage: memberAvatarColor
                })
              }}>
                {!memberAvatarImage && (
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>
                    {member.username.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="member-info">
                <div className="member-name">
                  {member.username}
                  {isMe && ' (You)'}
                  {member.role === 'admin' && (
                    <Crown size={12} style={{ marginLeft: '4px', color: 'var(--icq-yellow)' }} />
                  )}
                </div>
                <div className="member-role">
                  {member.role === 'admin' ? 'Admin' : 'Member'}
                </div>
              </div>

              {canRemove && (
                <button
                  className="remove-member-button"
                  onClick={() => handleRemoveMember(member.publicKey)}
                  title="Remove member"
                >
                  <UserMinus size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions - Always visible */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-secondary)',
        background: 'var(--bg-tertiary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={handleLeaveGroup}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '13px',
            fontWeight: '600',
            background: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = '#ff6666'}
          onMouseLeave={(e) => e.target.style.background = '#ff4444'}
        >
          {isCreator ? 'Delete Group' : 'Leave Group'}
        </button>
        {isCreator && (
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            As creator, this will delete the group for everyone
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupMembers;
