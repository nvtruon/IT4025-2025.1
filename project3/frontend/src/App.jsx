import { useState } from 'react';
import LoginScreen from './components/LoginScreen.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import ChatService from './services/ChatService.js';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);

  const handleLogin = (user) => {
    setUsername(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUsername(null);
    setIsAuthenticated(false);
    // Disconnect from chat service
    ChatService.disconnect();
  };

  return (
    <div className="App">
      {!isAuthenticated ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <ChatScreen username={username} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
