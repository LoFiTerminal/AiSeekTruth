import { useState } from 'react';
import { MessageCircle, Lock } from 'lucide-react';
import useStore from '../store';

function SetupWizard() {
  const { setIdentity } = useStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
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
        // Create new identity
        const result = await window.api.createIdentity(
          formData.username,
          formData.password
        );

        if (result.success) {
          setIdentity(result.identity);
        } else {
          setErrors({ general: result.error || 'Failed to create identity' });
        }
      } else {
        // Login with existing identity
        const result = await window.api.loadIdentity(formData.password);

        if (result.success) {
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
      <div className="setup-container">
        <div className="setup-header">
          <div className="setup-icon-wrapper">
            <MessageCircle className="setup-icon" size={60} />
            <Lock className="setup-lock-icon" size={24} />
          </div>
          <h1 className="setup-title">
            {mode === 'create' ? 'Welcome to AiSeekTruth' : 'Welcome Back'}
          </h1>
          <p className="setup-subtitle">
            {mode === 'create'
              ? 'Create your decentralized identity'
              : 'Login to your encrypted identity'}
          </p>
        </div>

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
            <div className="form-error text-center">{errors.general}</div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : mode === 'create' ? (
              'Create Identity'
            ) : (
              'Login'
            )}
          </button>

          <button type="button" onClick={toggleMode} disabled={isLoading}>
            {mode === 'create'
              ? 'Already have an identity? Login'
              : 'Create new identity'}
          </button>
        </form>

        <div className="setup-footer">
          <p>
            Your identity is encrypted with your password using Argon2id + XSalsa20-Poly1305.
            <br />
            All messages use Signal Protocol end-to-end encryption.
            <br />
            We never see your password or private keys.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SetupWizard;
