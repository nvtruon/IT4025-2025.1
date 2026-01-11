import { forwardRef } from 'react';

const MessageList = forwardRef(({ messages, loading, formatTime }, ref) => {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>LOADING...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyChat}>
          <p>NO MESSAGES.</p>
          <p>INSERT COIN TO START.</p>
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
            ...(message.direction === 'outgoing' ? styles.messageOutgoingContent : styles.messageIncomingContent),
            ...(message.isError ? styles.messageErrorContent : {})
          }}>
            {message.text}
          </div>
          <div style={styles.messageTime}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      ))}
      <div ref={ref} />
    </div>
  );
});

MessageList.displayName = 'MessageList';

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    backgroundColor: '#222034', // var(--pixel-bg-dark)
    position: 'relative',
    backgroundImage: 'radial-gradient(#333 1px, transparent 1px)',
    backgroundSize: '20px 20px'
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#fff',
    fontFamily: '"VT323", monospace',
    fontSize: '24px'
  },
  emptyChat: {
    textAlign: 'center',
    padding: '40px',
    color: '#8f9799',
    fontSize: '20px'
  },
  message: {
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '80%',
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
    padding: '15px',
    fontSize: '18px',
    lineHeight: '1.4',
    wordWrap: 'break-word',
    border: '4px solid #000',
    boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)',
    position: 'relative'
  },
  messageIncomingContent: {
    backgroundColor: '#fff',
    color: '#000',
  },
  messageOutgoingContent: {
    backgroundColor: '#66ccff',
    color: '#000',
  },
  messageErrorContent: {
    backgroundColor: '#ac3232', // Red
    color: '#fff',
    border: '4px solid #fbf236' // Yellow warning border
  },
  messageTime: {
    fontSize: '12px',
    color: '#8f9799',
    marginTop: '6px',
    padding: '0 4px',
    fontFamily: '"Arial", sans-serif', // Readable font
    fontWeight: 'bold',
    opacity: 0.8
  }
};

export default MessageList;
