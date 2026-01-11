import { useState, useEffect, useRef, useCallback } from 'react';
import ChatService from '../services/ChatService.js';
import StorageService from '../services/StorageService.js';
import UserList from './UserList.jsx';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import LoginPanel from './LoginPanel.jsx';

function ChatScreen({ username, isAuthenticated, onLogin, onLogout, loading, error }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Layout State
  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true);

  // Resize Handlers
  const startResizing = useCallback(() => setIsDragging(true), []);
  const stopResizing = useCallback(() => setIsDragging(false), []);

  const resize = useCallback((mouseEvent) => {
    if (isDragging) {
      const newWidth = mouseEvent.clientX;
      if (newWidth > 240 && newWidth < 500) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowSidebar(true);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('resize', handleResize);
    };
  }, [resize, stopResizing]);

  // Load users list on mount and listen for updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUsers = async () => {
      // 1. Get known peers from local storage
      const knownPeers = await StorageService.getKnownPeers();

      setUsers(currentUsers => {
        // Map known peers to user objects (initially offline)
        const offlineUsers = knownPeers
          .filter(peer => peer !== username)
          .map(peer => ({ username: peer, status: 'offline' }));

        // If we already have online users, merge them
        const onlineUsernames = new Set(currentUsers.filter(u => u.status !== 'offline').map(u => u.username));

        // Return unique list, preferring online status
        const merged = [...currentUsers.filter(u => u.status !== 'offline')];
        offlineUsers.forEach(u => {
          if (!onlineUsernames.has(u.username)) {
            merged.push(u);
          }
        });
        return merged;
      });

      ChatService.getUsers();
    };

    fetchUsers();

    // Set up socket listener for users_list event
    const socket = ChatService.getSocket();
    if (socket) {
      const handleUsersList = async (data) => {
        const onlineUsersList = (data.users || []).filter(user => user.username !== username);
        const onlineUsernames = new Set(onlineUsersList.map(u => u.username));

        // Get known peers again to ensure we have the latest
        const knownPeers = await StorageService.getKnownPeers();

        // Construct final list: Online users + Known (Offline) users
        const finalUsers = [...onlineUsersList.map(u => ({ ...u, status: 'online' }))];

        knownPeers.forEach(peer => {
          if (peer !== username && !onlineUsernames.has(peer)) {
            finalUsers.push({ username: peer, status: 'offline' });
          }
        });

        setUsers(finalUsers);
      };

      socket.on('users_list', handleUsersList);

      // Poll for users periodically (every 5 seconds)
      const interval = setInterval(() => {
        ChatService.getUsers();
      }, 5000);

      return () => {
        socket.off('users_list', handleUsersList);
        clearInterval(interval);
      };
    }
  }, [username, isAuthenticated]);

  // Set up message handler
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleMessage = (messageData) => {
      if (messageData.error) {
        console.error('Message error:', messageData.error);
        if (selectedUser && messageData.sender === selectedUser) {
          setMessages(prev => [...prev, {
            text: '⚠️ Decryption Failed: ' + (messageData.error || 'Unknown error'),
            sender: messageData.sender,
            timestamp: messageData.timestamp,
            direction: 'incoming',
            isError: true
          }]);
        }
        return;
      }

      // If message is for currently selected user, add to messages
      if (selectedUser && messageData.sender === selectedUser) {
        setMessages(prev => [...prev, {
          text: messageData.text,
          sender: messageData.sender,
          timestamp: messageData.timestamp,
          direction: 'incoming'
        }]);
      }

      // Refresh user list to insure new peer appears in list
      ChatService.getUsers();
    };

    const unregister = ChatService.onReceive(handleMessage);

    return () => {
      unregister();
    };
  }, [selectedUser, isAuthenticated]);

  // Load chat history when user is selected
  useEffect(() => {
    if (selectedUser && isAuthenticated) {
      loadChatHistory(selectedUser);
      // On mobile, hide sidebar when a user is selected
      if (isMobile) setShowSidebar(false);
    }
  }, [selectedUser, isAuthenticated, isMobile]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async (peerName) => {
    try {
      setChatLoading(true);
      const history = await StorageService.loadHistory(peerName);
      setMessages(history || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await ChatService.sendSecure(messageText, selectedUser);

      // Add message to UI immediately (it will also be saved by ChatService)
      setMessages(prev => [...prev, {
        text: messageText,
        recipient: selectedUser,
        timestamp: Date.now(),
        direction: 'outgoing'
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
      // Restore message text on error
      setNewMessage(messageText);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      {/* Sidebar Panel */}
      <div style={{
        ...styles.sidebar,
        width: isMobile ? '100%' : `${sidebarWidth}px`,
        display: (isMobile && !showSidebar) ? 'none' : 'flex'
      }} className="pixel-border">

        <div>
          <LoginPanel
            isAuthenticated={isAuthenticated}
            username={username}
            onLogin={onLogin}
            onLogout={onLogout}
            loading={loading}
            error={error}
          />
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {isAuthenticated ? (
            <UserList
              users={users}
              selectedUser={selectedUser}
              onSelectUser={setSelectedUser}
              onRefresh={() => ChatService.getUsers()}
            />
          ) : (
            <div style={styles.emptyState}>
              <p>LOGIN REQUIRED</p>
            </div>
          )}
        </div>
      </div>

      {/* Resizer Handle (Desktop Only) */}
      {!isMobile && (
        <div
          onMouseDown={startResizing}
          style={styles.resizer}
        />
      )}

      {/* Main Chat Area */}
      <div style={{
        ...styles.chatArea,
        display: (isMobile && showSidebar) ? 'none' : 'flex'
      }} className="pixel-border">
        {isAuthenticated ? (
          selectedUser ? (
            <>
              {/* Mobile Back Button */}
              {isMobile && (
                <button style={styles.backButton} onClick={() => setShowSidebar(true)}>
                  &lt; BACK
                </button>
              )}

              <ChatHeader username={selectedUser} />

              <MessageList
                messages={messages}
                loading={chatLoading}
                formatTime={formatTime}
                ref={messagesEndRef}
              />

              <MessageInput
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onSubmit={handleSendMessage}
              />
            </>
          ) : (
            <div style={styles.noSelection}>
              <p>&lt;&lt; SELECT USER</p>
            </div>
          )
        ) : (
          <div style={styles.noSelection}>
            <h3>PLEASE LOGIN</h3>
            <p>ACCESS DENIED</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#222034', // var(--pixel-bg-dark)
    padding: '10px',
    gap: '0'
  },
  sidebar: {
    backgroundColor: '#45283c', // var(--pixel-bg-light)
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
  },
  resizer: {
    width: '10px',
    cursor: 'col-resize',
    backgroundColor: '#222034',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#222034',
    overflow: 'hidden',
    position: 'relative'
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8f9799', // var(--pixel-text-dim)
    fontSize: '24px',
    gap: '24px',
    textTransform: 'uppercase'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#8f9799',
    marginTop: 'auto',
    marginBottom: 'auto'
  },
  backButton: {
    padding: '10px',
    background: '#ac3232', // red
    color: 'white',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%'
  }
};

export default ChatScreen;
