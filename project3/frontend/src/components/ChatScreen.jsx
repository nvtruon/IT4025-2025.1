import { useState, useEffect, useRef } from 'react';
import ChatService from '../services/ChatService.js';
import StorageService from '../services/StorageService.js';

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
      {/* Left Sidebar - User List */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Online Users</h2>
          <div style={styles.userInfo}>
            <span style={styles.currentUser}>{username}</span>
            <button onClick={onLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
        
        <div style={styles.userList}>
          {users.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No other users online</p>
              <button 
                onClick={() => ChatService.getUsers()} 
                style={styles.refreshButton}
              >
                Refresh
              </button>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.username}
                onClick={() => setSelectedUser(user.username)}
                style={{
                  ...styles.userItem,
                  ...(selectedUser === user.username ? styles.userItemSelected : {})
                }}
              >
                <div style={styles.userAvatar}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div style={styles.userDetails}>
                  <div style={styles.userName}>{user.username}</div>
                  <div style={styles.userStatus}>Online</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Chat Window */}
      <div style={styles.chatArea}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderUser}>
                <div style={styles.chatAvatar}>
                  {selectedUser.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.chatUserName}>{selectedUser}</div>
                  <div style={styles.chatUserStatus}>Online</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={styles.messagesContainer}>
              {loading ? (
                <div style={styles.loading}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={styles.emptyChat}>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.message,
                      ...(message.direction === 'outgoing' ? styles.messageOutgoing : styles.messageIncoming)
                    }}
                  >
                    <div style={{
                      ...styles.messageContent,
                      ...(message.direction === 'outgoing' ? styles.messageOutgoingContent : styles.messageIncomingContent)
                    }}>
                      {message.text}
                    </div>
                    <div style={styles.messageTime}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} style={styles.inputContainer}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                style={styles.messageInput}
              />
              <button type="submit" style={styles.sendButton}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={styles.noSelection}>
            <p>Select a user from the sidebar to start chatting</p>
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
    backgroundColor: '#f5f5f5'
  },
  sidebar: {
    width: '300px',
    backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0'
  },
  sidebarTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  userInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  currentUser: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  logoutButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  userList: {
    flex: 1,
    overflowY: 'auto'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#999'
  },
  refreshButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.2s'
  },
  userItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeft: '3px solid #2196f3'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#2196f3',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    marginRight: '12px'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px'
  },
  userStatus: {
    fontSize: '12px',
    color: '#4caf50'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff'
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fafafa'
  },
  chatHeaderUser: {
    display: 'flex',
    alignItems: 'center'
  },
  chatAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#4caf50',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    marginRight: '12px'
  },
  chatUserName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333'
  },
  chatUserStatus: {
    fontSize: '12px',
    color: '#666'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#fafafa'
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#999'
  },
  emptyChat: {
    textAlign: 'center',
    padding: '40px',
    color: '#999'
  },
  message: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '70%'
  },
  messageIncoming: {
    alignItems: 'flex-start'
  },
  messageOutgoing: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end'
  },
  messageContent: {
    padding: '12px 16px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.4',
    wordWrap: 'break-word',
    backgroundColor: '#e0e0e0',
    color: '#333'
  },
  messageIncomingContent: {
    backgroundColor: '#e0e0e0',
    color: '#333'
  },
  messageOutgoingContent: {
    backgroundColor: '#2196f3',
    color: 'white'
  },
  messageTime: {
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
    padding: '0 4px'
  },
  inputContainer: {
    display: 'flex',
    padding: '16px 20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fff'
  },
  messageInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #e0e0e0',
    borderRadius: '24px',
    outline: 'none',
    marginRight: '12px'
  },
  sendButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer'
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '16px'
  }
};

export default ChatScreen;

