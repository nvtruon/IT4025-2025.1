import { forwardRef } from 'react';
import { CheckCheck } from 'lucide-react';

const MessageList = forwardRef(({ messages, currentUser, selectedUserAvatar }, ref) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px 16px',
      backgroundColor: '#f8fafc',
      backgroundImage: `radial-gradient(#e2e8f0 1px, transparent 1px)`,
      backgroundSize: '24px 24px'
    }} className="custom-scrollbar">
      {messages.map((msg, index) => {
        const isMe = msg.direction === 'outgoing' || msg.sender === currentUser;

        // Grouping Logic
        const nextMsg = messages[index + 1];
        const prevMsg = messages[index - 1];

        const isNextSameSender = nextMsg && nextMsg.sender === msg.sender;
        const isPrevSameSender = prevMsg && prevMsg.sender === msg.sender;

        // Show avatar only if it's the LAST message in a sequence (for incoming)
        // AND not 'Me'
        const showAvatar = !isMe && (!isNextSameSender);

        // Dynamic Border Radius
        // Default all rounded 18px
        let borderTopRight = '18px';
        let borderBottomRight = '18px';
        let borderTopLeft = '18px';
        let borderBottomLeft = '18px';

        if (isMe) {
          // Outgoing
          if (isPrevSameSender) borderTopRight = '4px';
          if (isNextSameSender) borderBottomRight = '4px';
          else borderBottomRight = '0'; // Tail for very last
        } else {
          // Incoming
          if (isPrevSameSender) borderTopLeft = '4px';
          if (isNextSameSender) borderBottomLeft = '4px';
          else borderBottomLeft = '0'; // Tail for very last
        }

        return (
          <div key={index} style={{
            display: 'flex',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            marginBottom: isNextSameSender ? '2px' : '16px', // Tight spacing for groups
            alignItems: 'flex-end'
          }}>
            {!isMe && (
              <div style={{ width: '32px', marginRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {showAvatar && (
                  <img
                    src={selectedUserAvatar}
                    alt="Avatar"
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                )}
              </div>
            )}

            <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: '18px',
                  borderTopRightRadius: borderTopRight,
                  borderBottomRightRadius: borderBottomRight,
                  borderTopLeftRadius: borderTopLeft,
                  borderBottomLeftRadius: borderBottomLeft,

                  position: 'relative',
                  fontSize: '15px',
                  lineHeight: '1.4',

                  backgroundColor: isMe ? '#4f46e5' : '#ffffff',
                  backgroundImage: isMe ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'none',
                  color: isMe ? 'white' : '#1f2937',
                  border: isMe ? 'none' : '1px solid #e5e7eb', // gray-200
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {msg.text}
              </div>

              {/* Timestamp - Only show for last in group to reduce clutter */}
              {!isNextSameSender && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '4px',
                  gap: '4px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  padding: '0 4px',
                  userSelect: 'none'
                }}>
                  <span>{formatTime(msg.timestamp)}</span>
                  {isMe && <CheckCheck size={14} color="#6366f1" />}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={ref} />
    </div>
  );
});

MessageList.displayName = 'MessageList';

export default MessageList;
