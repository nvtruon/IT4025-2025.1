import { forwardRef } from 'react';

const MessageList = forwardRef(({ messages, loading, formatTime }, ref) => {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyChat}>
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {messages.map((message, index) => (
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
      ))}
      <div style={styles.todayDivider}>Today</div>
      <div ref={ref} />
    </div>
  );
});

MessageList.displayName = 'MessageList';

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
    backgroundColor: '#f5f7fa',
    position: 'relative'
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#65676b'
  },
  emptyChat: {
    textAlign: 'center',
    padding: '40px',
    color: '#65676b'
  },
  message: {
    marginBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '70%',
    animation: 'fadeIn 0.3s ease-in'
  },
  messageIncoming: {
    alignItems: 'flex-start',
    marginRight: 'auto'
  },
  messageOutgoing: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    marginLeft: 'auto'
  },
  messageContent: {
    padding: '12px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    lineHeight: '1.5',
    wordWrap: 'break-word',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  messageIncomingContent: {
    backgroundColor: '#ffffff',
    color: '#1a1d29',
    borderBottomLeftRadius: '6px',
    border: '1px solid #e8ecf1'
  },
  messageOutgoingContent: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderBottomRightRadius: '6px',
    marginRight: '8px'
  },
  messageTime: {
    fontSize: '11px',
    color: '#8a8d91',
    marginTop: '4px',
    padding: '0 4px'
  },
  todayDivider: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#8a8d91',
    margin: '16px 0',
    position: 'relative'
  }
};

export default MessageList;
