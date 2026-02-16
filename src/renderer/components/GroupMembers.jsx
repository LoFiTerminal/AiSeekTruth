import { useState, useEffect } from 'react';
import { User, UserPlus, UserMinus, Crown, X } from 'lucide-react';
import useStore from '../store';

function GroupMembers({ group, onClose }) {
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
        onClose();
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
      {/* Header */}
      <div className="group-members-header">
        <h3>Members ({members.length})</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Add Member Button */}
      {isAdmin && availableContacts.length > 0 && (
        <button
          className="add-member-button"
          onClick={() => setShowAddMember(!showAddMember)}
        >
          <UserPlus size={14} />
          Add Member
        </button>
      )}

      {/* Add Member Form */}
      {showAddMember && (
        <div className="add-member-form">
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

      {/* Members List */}
      <div className="group-members-list">
        {members.map(member => {
          const isMe = member.publicKey === identity?.publicKey;
          const canRemove = isAdmin && !isMe && member.role !== 'admin';

          return (
            <div key={member.publicKey} className="group-member-item">
              <div className="member-avatar">
                <User size={16} />
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

      {/* Leave Group Button */}
      {!isCreator && (
        <button
          className="leave-group-button"
          onClick={handleLeaveGroup}
        >
          Leave Group
        </button>
      )}
    </div>
  );
}

export default GroupMembers;
