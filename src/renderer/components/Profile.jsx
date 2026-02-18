import { useState } from 'react';
import { User, Copy, Check, Settings, Circle, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import useStore from '../store';
import AwayMessage from './AwayMessage';
import soundManager from '../utils/sounds';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #00ff41 0%, #00ffff 100%)',
  'linear-gradient(135deg, #ff006e 0%, #8338ec 100%)',
  'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
  'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
  'linear-gradient(135deg, #06ffa5 0%, #06d6a0 100%)',
  'linear-gradient(135deg, #f72585 0%, #b5179e 100%)',
];

const STATUSES = [
  { value: 'online', label: 'Online', color: '#00ff41' },
  { value: 'away', label: 'Away', color: '#ffaa00' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#ff4444' },
  { value: 'invisible', label: 'Invisible', color: '#6b7280' },
];

function Profile({ onClose }) {
  const { identity } = useStore();
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedColor, setSelectedColor] = useState(localStorage.getItem('avatarColor') || AVATAR_COLORS[0]);
  const [selectedStatus, setSelectedStatus] = useState(localStorage.getItem('userStatus') || 'online');
  const [showAwayMessage, setShowAwayMessage] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(soundManager.isEnabled());
  const [soundVolume, setSoundVolume] = useState(soundManager.getVolume());
  const [avatarImage, setAvatarImage] = useState(localStorage.getItem('avatarImage') || null);
  const [imagePosition, setImagePosition] = useState({
    x: parseInt(localStorage.getItem('avatarImageX') || '50'),
    y: parseInt(localStorage.getItem('avatarImageY') || '50')
  });
  const [imageZoom, setImageZoom] = useState(parseInt(localStorage.getItem('avatarImageZoom') || '100'));

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setCopiedKey(null);
    }, 2000);
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    localStorage.setItem('avatarColor', color);
    // Trigger re-render of other components
    window.dispatchEvent(new Event('avatarColorChanged'));
  };

  const handleStatusChange = async (status) => {
    setSelectedStatus(status);
    localStorage.setItem('userStatus', status);
    // Update status in backend
    if (window.api) {
      await window.api.updateStatus(status);
    }
    // Trigger re-render of other components
    window.dispatchEvent(new Event('userStatusChanged'));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 500KB for P2P sharing)
    if (file.size > 500 * 1024) {
      alert('Image too large! Please choose an image smaller than 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      setAvatarImage(base64Image);
      localStorage.setItem('avatarImage', base64Image);
      // Trigger re-render of other components
      window.dispatchEvent(new Event('avatarImageChanged'));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAvatarImage(null);
    localStorage.removeItem('avatarImage');
    localStorage.removeItem('avatarImageX');
    localStorage.removeItem('avatarImageY');
    localStorage.removeItem('avatarImageZoom');
    setImagePosition({ x: 50, y: 50 });
    setImageZoom(100);
    // Trigger re-render of other components
    window.dispatchEvent(new Event('avatarImageChanged'));
  };

  const handlePositionChange = (axis, value) => {
    const newPosition = { ...imagePosition, [axis]: value };
    setImagePosition(newPosition);
    localStorage.setItem(`avatarImage${axis.toUpperCase()}`, value);
    window.dispatchEvent(new Event('avatarImageChanged'));
  };

  const handleZoomChange = (value) => {
    setImageZoom(value);
    localStorage.setItem('avatarImageZoom', value);
    window.dispatchEvent(new Event('avatarImageChanged'));
  };

  if (!identity) return null;

  const currentStatus = STATUSES.find(s => s.value === selectedStatus) || STATUSES[0];

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal-header">
          <h2>
            <Settings size={20} />
            My Profile
          </h2>
          <button onClick={onClose} className="profile-modal-close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="profile-modal-body">
          {/* User Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-large" style={{
              ...(avatarImage ? {
                backgroundImage: `url(${avatarImage})`,
                backgroundSize: `${imageZoom}%`,
                backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                backgroundRepeat: 'no-repeat'
              } : {
                backgroundImage: selectedColor
              })
            }}>
              {!avatarImage && identity.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="profile-username">{identity.username}</div>
            <div className="profile-status">
              <span style={{ color: currentStatus.color }}>●</span>
              {currentStatus.label}
            </div>
          </div>

          {/* Profile Image Upload */}
          <div className="profile-field">
            <label className="profile-field-label">Profile Image</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <User size={16} />
                  {avatarImage ? 'Change Image' : 'Upload Image'}
                </button>
                {avatarImage && (
                  <button
                    onClick={handleRemoveImage}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--status-dnd)',
                      border: 'none',
                      color: 'white',
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                Max 500KB • Shared via P2P network
              </p>
            </div>
          </div>

          {/* Image Position Controls (only when image is uploaded) */}
          {avatarImage && (
            <div className="profile-field">
              <label className="profile-field-label">Adjust Image Position</label>

              {/* Zoom Control */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Zoom: {imageZoom}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={imageZoom}
                  onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Horizontal Position */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Horizontal Position: {imagePosition.x}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imagePosition.x}
                  onChange={(e) => handlePositionChange('x', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Vertical Position */}
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Vertical Position: {imagePosition.y}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imagePosition.y}
                  onChange={(e) => handlePositionChange('y', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                Drag the sliders to position your image perfectly in the circle
              </p>
            </div>
          )}

          {/* Avatar Color Picker (fallback when no image) */}
          {!avatarImage && (
            <div className="profile-field">
              <label className="profile-field-label">Avatar Color</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {AVATAR_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleColorChange(color)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: color,
                      border: selectedColor === color ? '3px solid var(--terminal-green)' : '2px solid var(--border-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selectedColor === color ? '0 0 15px rgba(0, 255, 65, 0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status Selector */}
          <div className="profile-field">
            <label className="profile-field-label">Status</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STATUSES.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: selectedStatus === status.value ? 'var(--bg-active)' : 'var(--bg-tertiary)',
                    border: selectedStatus === status.value ? '1px solid var(--terminal-green)' : '1px solid var(--border-secondary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: selectedStatus === status.value ? '600' : '400',
                  }}
                >
                  <Circle size={12} fill={status.color} color={status.color} />
                  {status.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAwayMessage(true)}
              style={{
                marginTop: '12px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={16} />
              Set Away Message
            </button>
          </div>

          {/* Sound Settings */}
          <div className="profile-field">
            <label className="profile-field-label">
              {soundsEnabled ? <Volume2 size={14} style={{ display: 'inline', marginRight: '6px' }} /> : <VolumeX size={14} style={{ display: 'inline', marginRight: '6px' }} />}
              Sound Notifications
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              border: '1px solid var(--border-secondary)',
              marginBottom: '12px',
            }}>
              <input
                type="checkbox"
                checked={soundsEnabled}
                onChange={(e) => {
                  setSoundsEnabled(e.target.checked);
                  soundManager.setEnabled(e.target.checked);
                  if (e.target.checked) {
                    soundManager.messageReceived(); // Test sound
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                Enable sound notifications
              </span>
            </label>

            {soundsEnabled && (
              <div>
                <label className="profile-field-label" style={{ fontSize: '11px', marginBottom: '8px' }}>
                  Volume: {Math.round(soundVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    setSoundVolume(vol);
                    soundManager.setVolume(vol);
                  }}
                  onMouseUp={() => soundManager.messageReceived()}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                  }}
                />
              </div>
            )}
          </div>

          {/* Public Key Section */}
          <div className="profile-field">
            <label className="profile-field-label">
              Your Public Key (Share this with contacts)
            </label>
            <div className="profile-field-value">
              {identity.publicKey}
            </div>
            <button
              onClick={() => copyToClipboard(identity.publicKey, 'public')}
              className={`profile-copy-btn ${copied && copiedKey === 'public' ? 'primary' : ''}`}
            >
              {copied && copiedKey === 'public' ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Public Key
                </>
              )}
            </button>
          </div>

          {/* Encryption Key Section */}
          {identity.encryptionPublicKey && (
            <div className="profile-field">
              <label className="profile-field-label">
                Encryption Public Key
              </label>
              <div className="profile-field-value">
                {identity.encryptionPublicKey}
              </div>
              <button
                onClick={() => copyToClipboard(identity.encryptionPublicKey, 'encryption')}
                className={`profile-copy-btn ${copied && copiedKey === 'encryption' ? 'primary' : ''}`}
              >
                {copied && copiedKey === 'encryption' ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Encryption Key
                  </>
                )}
              </button>
            </div>
          )}

          {/* Info Box */}
          <div className="profile-info-box">
            <strong>📋 How to add contacts:</strong>
            <ol>
              <li>Copy your Public Key using the button above</li>
              <li>Share it with your contact (via email, message, etc.)</li>
              <li>Ask them for their Public Key</li>
              <li>Add them using the "+ DM" button</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Away Message Modal */}
      {showAwayMessage && <AwayMessage onClose={() => setShowAwayMessage(false)} />}
    </div>
  );
}

export default Profile;
