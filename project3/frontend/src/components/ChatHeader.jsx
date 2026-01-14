import { Phone, Video, MoreVertical, Menu } from 'lucide-react';

function ChatHeader({ username, status, onMenuClick }) {
  const isOnline = status === 'online';
  const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=0D8ABC&color=fff`;

  return (
    <header className="flex items-center justify-between px-4 md:px-6 shadow-sm z-10" style={{
      height: '64px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px', // fallback
      width: '100%',
      position: 'relative',
      zIndex: 10
    }}>
      <div className="flex items-center" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Mobile Menu Button REMOVED */}

        <div style={{ position: 'relative' }}>
          <img
            src={avatarUrl}
            alt={username}
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
          />
          {isOnline && (
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '10px',
              height: '10px',
              backgroundColor: '#22c55e', // green-500
              border: '2px solid white',
              borderRadius: '50%'
            }}></span>
          )}
        </div>
        <div style={{ marginLeft: '12px' }}>
          <h3 style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '14px', margin: 0 }}>{username}</h3>
          <span style={{ fontSize: '12px', color: isOnline ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center' }}>
            {isOnline ? 'Đang hoạt động' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5' }}>
        <button style={{ padding: '8px', borderRadius: '9999px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#4f46e5' }} className="hidden sm:block">
          <Phone size={20} />
        </button>
        <button style={{ padding: '8px', borderRadius: '9999px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#4f46e5' }} className="hidden sm:block">
          <Video size={20} />
        </button>
        {/* MoreVertical Button REMOVED */}
      </div>
    </header>

  );
}

export default ChatHeader;
