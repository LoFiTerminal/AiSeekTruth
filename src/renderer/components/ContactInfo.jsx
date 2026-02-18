import { useState } from 'react';
import { User, X, Save, Trash2, AlertCircle, FileText } from 'lucide-react';

function ContactInfo({ contact, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(localStorage.getItem(`contact-notes-${contact.publicKey}`) || '');
  const [nickname, setNickname] = useState(contact.nickname || '');
  const [isBlocked, setIsBlocked] = useState(
    localStorage.getItem(`contact-blocked-${contact.publicKey}`) === 'true'
  );

  const handleSave = async () => {
    // Save notes to localStorage
    localStorage.setItem(`contact-notes-${contact.publicKey}`, notes);

    // Save blocked status
    localStorage.setItem(`contact-blocked-${contact.publicKey}`, isBlocked);

    // Update nickname via API
    if (nickname !== contact.nickname) {
      await window.api.updateContact(contact.publicKey, { nickname });
      onUpdate({ ...contact, nickname });
    }

    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete ${contact.username}? This will remove all message history.`)) {
      onDelete();
      onClose();
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div className="profile-modal-header">
          <h2>
            <User size={20} />
            Contact Information
          </h2>
          <button onClick={onClose} className="profile-modal-close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="profile-modal-body">
          {/* Contact Avatar */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {contact.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="profile-username">{contact.username}</div>
            <div className="profile-status">
              <span style={{ color: contact.status === 'online' ? 'var(--status-online)' : 'var(--status-offline)' }}>●</span>
              {contact.status === 'online' ? 'Online' : 'Offline'}
            </div>
          </div>

          {/* Nickname */}
          <div className="profile-field">
            <label className="profile-field-label">Nickname (Display Name)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={contact.username}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Leave empty to use their username
            </div>
          </div>

          {/* Contact Details */}
          <div className="profile-field">
            <label className="profile-field-label">Public Key</label>
            <div className="profile-field-value" style={{ fontSize: '11px' }}>
              {contact.publicKey}
            </div>
          </div>

          {/* Last Seen */}
          <div className="profile-field">
            <label className="profile-field-label">Last Seen</label>
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              {formatLastSeen(contact.lastSeen)}
            </div>
          </div>

          {/* Notes */}
          <div className="profile-field">
            <label className="profile-field-label">
              <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              Private Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes about this contact (only you can see these)..."
              style={{
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              maxLength={500}
            />
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Private notes are stored locally and never shared</span>
              <span>{notes.length}/500</span>
            </div>
          </div>

          {/* Block Contact */}
          <div className="profile-field">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: isBlocked ? 'rgba(255, 68, 68, 0.1)' : 'var(--bg-tertiary)',
              borderRadius: '6px',
              border: isBlocked ? '1px solid var(--status-dnd)' : '1px solid var(--border-secondary)',
            }}>
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>
                  <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                  Block this contact
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  You won't receive messages from blocked contacts
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '24px',
          }}>
            <button onClick={handleSave} className="primary" style={{ width: '100%' }}>
              <Save size={16} />
              Save Changes
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleDelete} className="danger" style={{ flex: 1 }}>
                <Trash2 size={16} />
                Delete Contact
              </button>
              <button onClick={onClose} className="secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactInfo;
