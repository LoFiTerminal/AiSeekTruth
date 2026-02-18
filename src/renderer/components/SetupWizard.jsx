import { useState } from 'react';
import { MessageCircle, Lock, Key, Shield, Cpu } from 'lucide-react';
import useStore from '../store';
import LoadingSpinner from './LoadingSpinner';

function SetupWizard() {
  const { setIdentity } = useStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [mode, setMode] = useState('create'); // 'create' | 'login'

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (mode === 'create' && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      if (mode === 'create') {
        // Create new identity with progress feedback
        setLoadingStep('Generating Ed25519 keypair');
        await new Promise(resolve => setTimeout(resolve, 300)); // Allow UI update

        const result = await window.api.createIdentity(
          formData.username,
          formData.password
        );

        if (result.success) {
          setLoadingStep('Encrypting private keys');
          await new Promise(resolve => setTimeout(resolve, 200));

          setLoadingStep('Initializing P2P network');
          await new Promise(resolve => setTimeout(resolve, 300));

          setIdentity(result.identity);
        } else {
          setErrors({ general: result.error || 'Failed to create identity' });
        }
      } else {
        // Login with existing identity
        setLoadingStep('Decrypting identity');
        const result = await window.api.loadIdentity(formData.password);

        if (result.success) {
          setLoadingStep('Connecting to network');
          await new Promise(resolve => setTimeout(resolve, 300));

          setIdentity(result.identity);
        } else {
          setErrors({ general: result.error || 'Invalid password' });
        }
      }
    } catch (error) {
      console.error('Setup error:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const toggleMode = async () => {
    setErrors({});
    setFormData({ username: '', password: '', confirmPassword: '' });

    if (mode === 'create') {
      // Check if identity exists before switching to login
      const exists = await window.api.identityExists();
      if (!exists) {
        setErrors({ general: 'No identity found. Please create one first.' });
        return;
      }
      setMode('login');
    } else {
      setMode('create');
    }
  };

  return (
    <div className="setup-wizard">
      {/* Retro scanline effect */}
      <div className="scanline-effect" />

      <div className="setup-container">
        <div className="setup-header">
          <img src="/icons/ast-icon-256.svg" alt="AiSeekTruth Logo" className="setup-logo" />
          <h1>
            {mode === 'create' ? 'AiSeekTruth' : 'Welcome Back'}
          </h1>
          <p>
            {mode === 'create'
              ? 'Create your decentralized identity'
              : 'Login to your encrypted identity'}
          </p>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <LoadingSpinner message={loadingStep} size="lg" />

            {/* Technical details */}
            <div style={{
              marginTop: '32px',
              padding: '16px',
              background: 'rgba(0, 255, 65, 0.05)',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              borderRadius: '6px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: "'Courier New', monospace",
              color: 'var(--text-muted)',
              lineHeight: '1.6',
            }}>
              {mode === 'create' ? (
                <>
                  <div style={{ marginBottom: '8px', color: 'var(--terminal-green)' }}>
                    <Cpu size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Creating secure identity...
                  </div>
                  <div style={{ paddingLeft: '20px' }}>
                    → Ed25519 signing keypair<br />
                    → X25519 encryption keypair<br />
                    → Argon2id key derivation<br />
                    → XSalsa20-Poly1305 encryption<br />
                    → Gun.js P2P initialization
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '8px', color: 'var(--terminal-green)' }}>
                    <Shield size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Authenticating...
                  </div>
                  <div style={{ paddingLeft: '20px' }}>
                    → Deriving decryption key<br />
                    → Verifying password<br />
                    → Decrypting private keys<br />
                    → Connecting to P2P network
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <form className="setup-form" onSubmit={handleSubmit}>
          {mode === 'create' && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={isLoading}
                autoFocus
              />
              {errors.username && (
                <span className="form-error">{errors.username}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={isLoading}
              autoFocus={mode === 'login'}
            />
            {errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
          </div>

          {mode === 'create' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <span className="form-error">{errors.confirmPassword}</span>
              )}
            </div>
          )}

          {errors.general && (
            <div className="form-error">{errors.general}</div>
          )}

          <div className="setup-actions">
            <button type="submit" className="primary" disabled={isLoading}>
              {isLoading ? '...' : mode === 'create' ? 'Create Identity' : 'Login'}
            </button>
          </div>

          <div className="setup-divider">or</div>

          <button type="button" className="secondary" onClick={toggleMode} disabled={isLoading}>
            {mode === 'create'
              ? 'Already have an identity? Login'
              : 'Create new identity'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;
