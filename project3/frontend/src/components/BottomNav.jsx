function BottomNav() {
  return (
    <div style={styles.container}>
      <button style={styles.navButton}>
        <span style={styles.navIcon}>💬</span>
        <span style={styles.navLabel}>Chats</span>
      </button>
      <button style={styles.navButton}>
        <span style={styles.navIcon}>📞</span>
        <span style={styles.navLabel}>Calls</span>
      </button>
      <button style={styles.navButton}>
        <span style={styles.navIcon}>👥</span>
        <span style={styles.navLabel}>Users</span>
      </button>
      <button style={styles.navButton}>
        <span style={styles.navIcon}>👤</span>
        <span style={styles.navLabel}>Groups</span>
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    borderTop: '2px solid #e8ecf1',
    backgroundColor: '#ffffff',
    padding: '12px 0',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
    borderRadius: '0 0 20px 20px'
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
  }
};

export default BottomNav;
