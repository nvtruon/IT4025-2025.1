import { useState, useEffect } from 'react';
import { digest } from './crypto/lib.js'; // Restore hashing
import ChatScreen from './components/ChatScreen.jsx';
import ChatService from './services/ChatService.js';
import StorageService from './services/StorageService.js';
import { getGovPublicKey, getCAPublicKey } from './constants.js';
import LoginPanel from './components/LoginPanel.jsx';
import SetupNameModal from './components/SetupNameModal.jsx';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null); // This will hold the HASHED ID
  const [loginInput, setLoginInput] = useState(''); // Plaintext login name for UI greetings
  const [displayName, setDisplayName] = useState(''); // Actual display name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);

  const handleLogin = async (user, password) => {
    setError('');
    setLoading(true);

    try {
      // HASH THE USERNAME (Restored per user request)
      // ID is the SHA-256 hash of the input
      const usernameID = await digest(user);
      setLoginInput(user); // Keep plaintext for greeting
      console.log(`Logging in as: ${user} (ID: ${usernameID.substring(0, 8)}...)`);

      // Get cryptographic keys
      const govPublicKey = await getGovPublicKey();
      const caPublicKey = await getCAPublicKey();

      // Priority: 1. Query Param (?server=...) -> 2. LocalStorage -> 3. Env Var -> 4. Default
      const params = new URLSearchParams(window.location.search);
      const queryUrl = params.get('server');
      const storedUrl = localStorage.getItem('chat_server_url');

      const backendUrl = queryUrl || storedUrl || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      if (queryUrl) {
        localStorage.setItem('chat_server_url', queryUrl);
      }

      console.log('Connecting to backend at:', backendUrl);

      // Init ChatService FIRST to allow restoreSession
      ChatService.init(caPublicKey, govPublicKey, backendUrl);

      // --- CLOUD RESTORE LOGIC ---
      console.log(`Checking cloud backup for ${usernameID}...`);
      const restored = await ChatService.restoreSession(usernameID);

      // Initialize StorageService
      await StorageService.init(usernameID, password);

      // Register WITHOUT displayName initially (pass null so backend doesn't overwrite if exists)
      const regResult = await ChatService.register(usernameID, null);

      // Login success
      setUsername(usernameID);
      setIsAuthenticated(true);

      // LOGIC: If server returned a name, use it. If not, show setup modal.
      if (regResult && regResult.displayName) {
        console.log('Loaded existing display name:', regResult.displayName);
        setDisplayName(regResult.displayName);
      } else {
        console.log('No display name found. Showing setup modal.');
        setShowSetupModal(true);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login.');
      ChatService.disconnect();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUsername(null);
    setDisplayName('');
    setIsAuthenticated(false);
    setShowSetupModal(false);
    ChatService.disconnect();
    setError('');
  };

  const handleSaveName = async (name) => {
    try {
      // Update registration with new Name
      await ChatService.register(username, name);
      setDisplayName(name);
      setShowSetupModal(false);
    } catch (err) {
      console.error('Failed to save name:', err);
    }
  };

  // Check for Display Name on User List update (Optional Sync)
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    const socket = ChatService.getSocket();
    if (!socket) return;

    const checkName = (data) => {
      const me = data.users.find(u => u.username === username);
      if (me && me.displayName && me.displayName !== displayName) {
        console.log('Syncing display name from server:', me.displayName);
        setDisplayName(me.displayName);
        // Ensure modal is closed if we have a name
        setShowSetupModal(false);
      }
    };

    socket.on('users_list', checkName);
    return () => {
      socket.off('users_list', checkName);
    };
  }, [isAuthenticated, username, displayName]);


  return (
    <div className="App">
      {!isAuthenticated ? (
        <LoginPanel
          isAuthenticated={isAuthenticated}
          username={username}
          onLogin={handleLogin}
          onLogout={handleLogout}
          loading={loading}
          error={error}
        />
      ) : (
        <>
          <ChatScreen
            username={username}
            displayName={displayName}
            isAuthenticated={isAuthenticated}
            onLogin={handleLogin} // Kept for generic prop structure
            onLogout={handleLogout}
            loading={loading}
            error={error}
          />
          {showSetupModal && (
            <SetupNameModal
              username={loginInput || username} // Greeting uses Plaintext
              defaultValue={loginInput} // Input pre-filled with Plaintext
              onSave={handleSaveName}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
