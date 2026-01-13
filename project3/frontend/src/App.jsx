import { useState } from 'react';
import ChatScreen from './components/ChatScreen.jsx';
import ChatService from './services/ChatService.js';
import StorageService from './services/StorageService.js';
import { getGovPublicKey, getCAPublicKey } from './constants.js';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (user, password) => {
    setError('');
    setLoading(true);

    try {
      // Get cryptographic keys
      const govPublicKey = await getGovPublicKey();
      const caPublicKey = await getCAPublicKey();

      // Priority: 1. Query Param (?server=...) -> 2. LocalStorage -> 3. Env Var -> 4. Default
      const params = new URLSearchParams(window.location.search);
      const queryUrl = params.get('server');
      const storedUrl = localStorage.getItem('chat_server_url');

      const backendUrl = queryUrl || storedUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      // If query param provided, save it for future matching convenience
      if (queryUrl) {
        localStorage.setItem('chat_server_url', queryUrl);
      }

      console.log('Connecting to backend at:', backendUrl);

      // Init ChatService FIRST to allow restoreSession
      ChatService.init(caPublicKey, govPublicKey, backendUrl);

      // --- CLOUD RESTORE LOGIC ---
      // ALWAYS check cloud backup because we are Memory-Only now.
      // There is no persistent local storage to check.
      console.log(`Checking cloud backup for ${user}...`);
      const restored = await ChatService.restoreSession(user);
      if (restored) {
        console.log('Session successfully restored from cloud!');
      } else {
        console.log('No cloud backup found. Creating new session.');
      }

      // Initialize StorageService (will load the restored keys if available)
      await StorageService.init(user, password);

      // Register user with the server (will wait for connection internally)
      await ChatService.register(user);

      // Login success
      setUsername(user);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login.');
      // If failed, disconnect to be safe
      ChatService.disconnect();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUsername(null);
    setIsAuthenticated(false);
    // Disconnect from chat service
    ChatService.disconnect();
    // Clear error
    setError('');
  };

  return (
    <div className="App">
      <ChatScreen
        username={username}
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
        loading={loading}
        error={error}
      />
    </div>
  );
}

export default App;
