function MessageInput({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={styles.container}>
      <input
        className="pixel-input"
        type="text"
        value={value}
        onChange={onChange}
        placeholder="TYPE MESSAGE..."
        style={styles.input}
      />
      <button type="submit" className="pixel-btn" style={styles.sendButton}>SEND</button>
    </form>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',

    backgroundColor: '#45283c', // contrast bg
    gap: '12px',
    minHeight: '80px',
    borderTop: '4px solid #000'
  },
  input: {
    flex: 1
  },
  sendButton: {
    height: '46px', // match input height roughly
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default MessageInput;
