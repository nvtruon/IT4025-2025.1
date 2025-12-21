import { useState } from 'react';
import ChatService from '../services/ChatService.js';
import StorageService from '../services/StorageService.js';
import { getGovPublicKey, getCAPublicKey } from '../constants.js';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Initialize StorageService with master password
      await StorageService.init(password);

      // Get cryptographic keys
      const govPublicKey = await getGovPublicKey();
      const caPublicKey = await getCAPublicKey();

      // Initialize ChatService with keys
      // Use port 3001 to match backend (configurable via third parameter)
      ChatService.init(caPublicKey, govPublicKey, 'http://localhost:3001');

      // Register user with the server
      await ChatService.register(username);

      // Wait a bit for socket connection
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call onLogin callback with username
      onLogin(username);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>Secure Chat App</h1>
        <h2 style={styles.subtitle}>Login</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
              placeholder="Enter your username"
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>
              Master Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
              placeholder="Enter your master password"
            />
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
          >
            {loading ? 'Connecting...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    margin: '0 0 30px 0',
    fontSize: '20px',
    textAlign: 'center',
    color: '#666'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  error: {
    padding: '12px',
    marginBottom: '20px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '14px'
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
};

export default LoginScreen;

