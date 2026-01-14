import { useState, useEffect, useRef } from 'react';
import ChatService from '../services/ChatService.js';
import StorageService from '../services/StorageService.js';
import UserList from './UserList.jsx';
import ChatHeader from './ChatHeader.jsx';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import { LogOut, Search, Menu } from 'lucide-react';

function ChatScreen({ username, displayName, isAuthenticated, onLogin, onLogout, loading, error }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Load users list
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUsers = async () => {
      const knownPeers = await StorageService.getKnownPeers();
      const peerNames = await StorageService.getPeerNames();

      setUsers(currentUsers => {
        // Retrieve cached displayNames for offline peers
        const offlineUsers = knownPeers
          .filter(peer => peer !== username)
          .map(peer => ({
            username: peer,
            displayName: peerNames[peer] || peer, // Use persisted name or fallback to username (Plaintext)
            status: 'offline'
          }));

        const onlineUsernames = new Set(currentUsers.filter(u => u.status !== 'offline').map(u => u.username));
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

    const socket = ChatService.getSocket();
    if (socket) {
      const handleUsersList = async (data) => {
        const onlineUsersList = (data.users || []).filter(user => user.username !== username);
        const onlineUsernames = new Set(onlineUsersList.map(u => u.username));
        const knownPeers = await StorageService.getKnownPeers();
        const peerNames = await StorageService.getPeerNames(); // Refresh names

        const finalUsers = [...onlineUsersList.map(u => ({ ...u, status: 'online' }))];
        knownPeers.forEach(peer => {
          if (peer !== username && !onlineUsernames.has(peer)) {
            finalUsers.push({
              username: peer,
              displayName: peerNames[peer] || peer, // Use persisted name or fallback to username (Plaintext)
              status: 'offline'
            });
          }
        });
        setUsers(finalUsers);
      };

      socket.on('users_list', handleUsersList);
      const interval = setInterval(() => ChatService.getUsers(), 5000);

      return () => {
        socket.off('users_list', handleUsersList);
        clearInterval(interval);
      };
    }
  }, [username, isAuthenticated]);

  // Handle messages
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleMessage = (messageData) => {
      if (selectedUser && messageData.sender === selectedUser) {
        setMessages(prev => [...prev, {
          text: messageData.error ? `⚠️ Error: ${messageData.error}` : messageData.text,
          sender: messageData.sender,
          timestamp: messageData.timestamp,
          direction: 'incoming',
          isError: !!messageData.error
        }]);
      }
      ChatService.getUsers();
    };
    const unregister = ChatService.onReceive(handleMessage);
    return () => unregister();
  }, [selectedUser, isAuthenticated]);

  // Load history
  useEffect(() => {
    if (selectedUser && isAuthenticated) {
      loadChatHistory(selectedUser);
      setIsMobileMenuOpen(false); // Close sidebar on mobile select
    }
  }, [selectedUser, isAuthenticated]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    // strict mode: auto scroll without animation ensures it always hits bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  };

  const loadChatHistory = async (peerName) => {
    try {
      setChatLoading(true);
      const history = await StorageService.loadHistory(peerName);
      setMessages(history || []);
    } catch (error) {
      console.error('Error loading history:', error);
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || !selectedUser) return;

    try {
      await ChatService.sendSecure(text, selectedUser);
      setMessages(prev => [...prev, {
        text: text,
        recipient: selectedUser,
        timestamp: Date.now(),
        direction: 'outgoing'
      }]);
    } catch (error) {
      console.error('Send error:', error);
      // Ideally show a toast here
    }
  };

  const avatarUrl = (name) => `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff`;

  // Helper to get display name of selected user
  const getSelectedDisplayName = () => {
    const u = users.find(u => u.username === selectedUser);
    return u ? (u.displayName || u.username) : selectedUser;
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden w-full">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: '320px',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#eff6ff'
        }}>
          <div className="flex items-center space-x-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Show Display Name if available, fallback to username (Hash) */}
            <img src={avatarUrl(displayName || username)} alt="User" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} />
            <div>
              <h3 style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '14px', margin: 0 }}>
                {displayName || username}
              </h3>
              <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', marginRight: '4px' }}></span>
                Online
              </span>
            </div>
          </div>
          <button onClick={onLogout} style={{ padding: '8px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }} title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px' }}>
          <div className="relative" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '8px',
                paddingBottom: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '9999px',
                fontSize: '14px',
                border: 'none',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* User List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }} className="custom-scrollbar">
          <UserList
            users={users}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
          />
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 40 }}
        ></div>
      )}

      {/* Main Chat */}
      <main className="flex-1 flex flex-col h-full bg-[#f8fafc] w-full relative" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc', position: 'relative' }}>
        {selectedUser ? (
          <>
            <ChatHeader
              username={getSelectedDisplayName()} // Pass display name
              status={users.find(u => u.username === selectedUser)?.status || 'offline'}
              onMenuClick={() => setIsMobileMenuOpen(true)}
            />

            <MessageList
              messages={messages}
              currentUser={username} // Keeping ID as currentUser for logic
              selectedUserAvatar={avatarUrl(getSelectedDisplayName())}
              ref={messagesEndRef}
            />

            <MessageInput
              onSendMessage={handleSendMessage}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
            <h3>Chọn một người để bắt đầu trò chuyện</h3>
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatScreen;
