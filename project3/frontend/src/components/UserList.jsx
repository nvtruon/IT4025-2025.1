function UserList({ users, selectedUser, onSelectUser, onRefresh }) {
  return (
    <div style={styles.container}>
      {users.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No other users online</p>
          <button onClick={onRefresh} style={styles.refreshButton}>
            Refresh
          </button>
        </div>
      ) : (
        users.map((user) => (
          <div
            key={user.username}
            onClick={() => onSelectUser(user.username)}
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
              <div style={styles.lastMessage}>Click to start chatting...</div>
            </div>
            <div style={styles.messageInfo}>
              <div style={styles.messageTime}>4:30 PM</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#fafbfc'
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
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f0f2f5',
    margin: '4px 8px',
    borderRadius: '16px'
  },
  userItemSelected: {
    backgroundColor: '#eef2ff',
    borderLeft: '4px solid #667eea',
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)'
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
  }
};

export default UserList;
