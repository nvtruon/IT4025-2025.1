function UserList({ users, selectedUser, onSelectUser, onRefresh }) {
  return (
    <div style={styles.container}>
      {users.length === 0 ? (
        <div style={styles.emptyState}>
          <p>NO SIGNAL...</p>
          <button onClick={onRefresh} className="pixel-btn">
            SCAN
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
              <div style={styles.userName}>
                {user.username}
                {user.status === 'offline' && <span style={styles.offlineTag}> [OFF]</span>}
                {user.status === 'online' && <span style={styles.onlineTag}> [ON]</span>}
              </div>
              <div style={styles.lastMessage}>PRESS START</div>
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
    backgroundColor: '#222034', // Dark bg
    padding: '10px'
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#8f9799'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    cursor: 'pointer',
    transition: 'all 0.1s',
    backgroundColor: '#45283c',
    marginBottom: '10px',
    border: '4px solid #000', // Pixel border
    boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)',
    color: '#fff'
  },
  userItemSelected: {
    backgroundColor: '#76428a',
    transform: 'translate(2px, 2px)',
    boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.5)'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    backgroundColor: '#df7126', // Orange
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    marginRight: '12px',
    flexShrink: 0,
    border: '2px solid #000'
  },
  userDetails: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '4px',
    textTransform: 'uppercase'
  },
  lastMessage: {
    fontSize: '14px',
    color: '#8f9799',
    textTransform: 'uppercase'
  },
  onlineTag: {
    color: '#99e550',
    fontSize: '16px',
    marginLeft: '4px'
  },
  offlineTag: {
    color: '#ac3232',
    fontSize: '16px',
    marginLeft: '4px'
  }
};

export default UserList;
