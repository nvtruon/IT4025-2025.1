function MessageInput({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={styles.container}>
      <button type="button" style={styles.iconButton}>➕</button>
      <button type="button" style={styles.iconButton}>🎤</button>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Type your message..."
        style={styles.input}
      />
      <button type="button" style={styles.iconButton}>😊</button>
      <button type="submit" style={styles.sendButton}>➤</button>
    </form>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 32px',
    borderTop: '2px solid #e8ecf1',
    backgroundColor: '#ffffff',
    gap: '12px',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
    minHeight: '80px',
    borderRadius: '0 0 20px 20px'
  },
  iconButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '20px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#65676b',
    transition: 'background-color 0.2s'
  },
  input: {
    flex: 1,
    padding: '12px 20px',
    fontSize: '14px',
    border: '2px solid #e8ecf1',
    borderRadius: '28px',
    outline: 'none',
    backgroundColor: '#f5f7fa',
    color: '#1a1d29',
    transition: 'all 0.2s'
  },
  sendButton: {
    width: '44px',
    height: '44px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  }
};

export default MessageInput;
