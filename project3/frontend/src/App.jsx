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
      // Initialize StorageService with master password and username
      // The service will automatically detect if this is a Login (existing user)
      // or Register (new user) based on whether data exists for this username.
      await StorageService.init(user, password);

      // Get cryptographic keys
      const govPublicKey = await getGovPublicKey();
      const caPublicKey = await getCAPublicKey();

      // Initialize ChatService with keys
      // Use port 3001 to match backend (configurable via third parameter)
      ChatService.init(caPublicKey, govPublicKey, 'http://localhost:3001');

      // Register user with the server (will wait for connection internally)
      await ChatService.register(user);

      // Login success
      setUsername(user);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login.');
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
