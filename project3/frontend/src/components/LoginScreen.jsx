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

      // Register user with the server (will wait for connection internally)
      await ChatService.register(username);

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
      {/* Login Form - Full Width */}
      <div style={styles.leftPanel}>
        <div style={styles.formWrapper}>
          <h1 style={styles.title}>LOGIN</h1>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <span style={styles.icon}>👤</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
                placeholder="Username"
              />
            </div>

            <div style={styles.inputGroup}>
              <span style={styles.icon}>🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
                placeholder="Password"
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
              {loading ? 'Connecting...' : 'Login Now'}
            </button>
          </form>

          <div style={styles.divider}>
            <span style={styles.dividerText}>Login with Others</span>
          </div>

          <button style={styles.socialButton}>
            <span style={styles.googleIcon}>G</span>
            Login with <strong>google</strong>
          </button>

          <button style={styles.socialButton}>
            <span style={styles.facebookIcon}>f</span>
            Login with <strong>Facebook</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    margin: 0,
    padding: 0
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: '40px',
    width: '100vw',
    minHeight: '100vh'
  },
  formWrapper: {
    width: '100%',
    maxWidth: '450px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    color: '#000'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 40px 0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f3f3f9',
    borderRadius: '8px',
    padding: '4px 16px',
    gap: '12px'
  },
  icon: {
    fontSize: '20px',
    color: '#999'
  },
  input: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    padding: '14px 0',
    fontSize: '15px',
    outline: 'none',
    color: '#333'
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center'
  },
  button: {
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    marginTop: '10px'
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  divider: {
    textAlign: 'center',
    margin: '30px 0',
    position: 'relative'
  },
  dividerText: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  socialButton: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    color: '#333',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  googleIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#4285f4',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  facebookIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#1877f2',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold'
  }
};

export default LoginScreen;