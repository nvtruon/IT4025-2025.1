import { useState, useEffect, useRef } from 'react';
import ChatService from '../services/ChatService.js';
import StorageService from '../services/StorageService.js';
import UserList from './UserList.jsx';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import BottomNav from './BottomNav.jsx';

function ChatScreen({ username, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load users list on mount and listen for updates
  useEffect(() => {
    // Get initial users list
    ChatService.getUsers();
    
    // Set up socket listener for users_list event
    const socket = ChatService.getSocket();
    if (socket) {
      const handleUsersList = (data) => {
        // Filter out current user from the list
        const otherUsers = (data.users || []).filter(user => user.username !== username);
        setUsers(otherUsers);
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
  }, [username]);

  // Set up message handler
  useEffect(() => {
    const handleMessage = (messageData) => {
      if (messageData.error) {
        console.error('Message error:', messageData.error);
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
    };

    const unregister = ChatService.onReceive(handleMessage);

    return () => {
      unregister();
    };
  }, [selectedUser]);

  // Load chat history when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadChatHistory(selectedUser);
    }
  }, [selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async (peerName) => {
    try {
      setLoading(true);
      const history = await StorageService.loadHistory(peerName);
      setMessages(history || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    } finally {
      setLoading(false);
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
      {/* Left Sidebar - Chats List */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Chats</h2>
          <button style={styles.menuButton}>⋮</button>
        </div>
        
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          onRefresh={() => ChatService.getUsers()}
        />

        <BottomNav />
      </div>

      {/* Right Side - Chat Window */}
      <div style={styles.chatArea}>
        {selectedUser ? (
          <>
            <ChatHeader username={selectedUser} />

            <MessageList
              messages={messages}
              loading={loading}
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
            <p>Select a user from the sidebar to start chatting</p>
            <div style={styles.userInfo}>
              <span style={styles.currentUserBadge}>Logged in as: {username}</span>
              <button onClick={onLogout} style={styles.logoutButton}>
                Logout
              </button>
            </div>
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
    margin: 0,
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    gap: '16px',
    padding: '0 8px 0 0'
  },
  sidebar: {
    width: '500px',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    borderRight: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    borderRadius: '20px',
    overflow: 'hidden'
  },
  sidebarHeader: {
    padding: '24px 24px',
    borderBottom: '2px solid #e8ecf1',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    minHeight: '76p20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    borderRadius: '0 20px 0 0'
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1d29',
    letterSpacing: '-0.5px'
  },
  menuButton: {
    width: '40px',
    height: '40px',
    border: 'none',
    backgroundColor: '#f5f7fa',
    fontSize: '20px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#5b6b7c',
    transition: 'all 0.2s'
  },
  userList: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#ffffff'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#65676b'
  },
  refreshButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    backgroundColor: '#ffffff'
  },
  userItemSelected: {
    backgroundColor: '#e7f3ff'
  },
  userAvatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '600',
    marginRight: '12px',
    flexShrink: 0
  },
  userDetails: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#050505',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  lastMessage: {
    fontSize: '13px',
    color: '#65676b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  messageInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: '8px'
  },
  messageTime: {
    fontSize: '11px',
    color: '#8a8d91',
    marginBottom: '4px'
  },
  bottomNav: {
    display: 'flex',
    borderTop: '1px solid #e4e6eb',
    backgroundColor: '#ffffff',
    padding: '8px 0'
  },
  navButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    color: '#667eea'
  },
  navIcon: {
    fontSize: '20px'
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: '500'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    marginRight: '8px'
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8a93a2',
    fontSize: '16px',
    gap: '24px',
    padding: '40px'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  currentUserBadge: {
    fontSize: '14px',
    color: '#1a1d29',
    fontWeight: '600',
    padding: '8px 16px',
    backgroundColor: '#f5f7fa',
    borderRadius: '12px'
  },
  logoutButton: {
    padding: '12px 28px',
    fontSize: '14px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
  }
};

export default ChatScreen; 
