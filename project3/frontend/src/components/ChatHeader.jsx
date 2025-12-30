function ChatHeader({ username }) {
  return (
    <div style={styles.container}>
      <div style={styles.userInfo}>
        <div style={styles.avatar}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={styles.userName}>{username}</div>
          <div style={styles.userStatus}>Online</div>
        </div>
      </div>
      <div style={styles.actions}>
        <button style={styles.iconButton}>📞</button>
        <button style={styles.iconButton}>📹</button>
        <button style={styles.iconButton}>ℹ️</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 28px',
    borderBottom: '2px solid #e8ecf1',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    minHeight: '76px',
    zIndex: 10,
    borderRadius: '20px 20px 0 0'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '600',
    marginRight: '12px'
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#050505',
    marginBottom: '2px'
  },
  userStatus: {
    fontSize: '12px',
    color: '#65676b'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  iconButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '18px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  }
};

export default ChatHeader;
