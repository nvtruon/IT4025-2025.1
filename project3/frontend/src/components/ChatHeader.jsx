function ChatHeader({ username }) {
  return (
    <div style={styles.container}>
      <div style={styles.userInfo}>
        <div style={styles.avatar}>
          {username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={styles.userName}>{username}</div>
          <div style={styles.userStatus}>ONLINE</div>
        </div>
      </div>
      <div style={styles.actions}>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: 'transparent', // Transparent to show main bg
    borderBottom: '4px solid #000',
    minHeight: '80px',
    zIndex: 10
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center'
  },
  avatar: {
    width: '48px',
    height: '48px',
    backgroundColor: '#76428a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    marginRight: '15px',
    border: '4px solid #000',
    boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)'
  },
  userName: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff', // White text
    textTransform: 'uppercase',
    textShadow: '2px 2px #000',
    lineHeight: '1'
  },
  userStatus: {
    fontSize: '16px',
    color: '#99e550', // Green
    textTransform: 'uppercase',
    marginTop: '4px'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  }
};

export default ChatHeader;
