import { useState, useEffect } from 'react';
import { MessageSquare, X, Save } from 'lucide-react';

const PRESET_AWAY_MESSAGES = [
  "I'm away from my computer right now.",
  "Be right back!",
  "Out to lunch. Back in 30 mins.",
  "In a meeting. Will respond ASAP.",
  "Gone for the day. See you tomorrow!",
  "Busy. Please leave a message.",
  "Do Not Disturb - Working on something important.",
  "Taking a break. BRB!",
];

function AwayMessage({ onClose }) {
  const [customMessage, setCustomMessage] = useState(
    localStorage.getItem('awayMessage') || PRESET_AWAY_MESSAGES[0]
  );
  const [enableAwayMessage, setEnableAwayMessage] = useState(
    localStorage.getItem('enableAwayMessage') === 'true'
  );

  const handleSave = () => {
    localStorage.setItem('awayMessage', customMessage);
    localStorage.setItem('enableAwayMessage', enableAwayMessage);
    window.dispatchEvent(new Event('awayMessageChanged'));
    onClose();
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        {/* Header */}
        <div className="profile-modal-header">
          <h2>
            <MessageSquare size={20} />
            Away Message
          </h2>
          <button onClick={onClose} className="profile-modal-close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="profile-modal-body">
          <div className="profile-info-box" style={{ marginBottom: '20px' }}>
            <strong>💬 About Away Messages</strong>
            <p style={{ marginTop: '8px', fontSize: '13px' }}>
              When you're set to Away or DND, contacts will see this message when they try to chat with you.
            </p>
          </div>

          {/* Enable Toggle */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              border: '1px solid var(--border-secondary)',
            }}>
              <input
                type="checkbox"
                checked={enableAwayMessage}
                onChange={(e) => setEnableAwayMessage(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                Enable away message
              </span>
            </label>
          </div>

          {/* Preset Messages */}
          <div className="profile-field">
            <label className="profile-field-label">Quick Presets</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PRESET_AWAY_MESSAGES.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => setCustomMessage(msg)}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: customMessage === msg ? 'var(--bg-active)' : 'var(--bg-tertiary)',
                    border: customMessage === msg ? '1px solid var(--terminal-green)' : '1px solid var(--border-secondary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s',
                  }}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div className="profile-field">
            <label className="profile-field-label">Custom Message</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your custom away message..."
              style={{
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              maxLength={200}
            />
            <div style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '4px',
              textAlign: 'right',
            }}>
              {customMessage.length}/200 characters
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px',
          }}>
            <button onClick={handleSave} className="primary" style={{ flex: 1 }}>
              <Save size={16} />
              Save Away Message
            </button>
            <button onClick={onClose} className="secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AwayMessage;
