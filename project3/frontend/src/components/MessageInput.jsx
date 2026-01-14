import { useState } from 'react';
import { Paperclip, Smile, Send } from 'lucide-react';

function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: 'white' }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#f9fafb', // gray-50
        border: '1px solid #e5e7eb', // gray-200
        borderRadius: '9999px',
        padding: '8px 8px 8px 16px',
        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s'
      }}>
        {/* Paperclip Button REMOVED */}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '14px',
            color: '#374151'
          }}
        />

        <button type="button" style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }} className="hidden sm:block">
          <Smile size={20} />
        </button>

        <button
          type="submit"
          disabled={!text.trim()}
          style={{
            padding: '12px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: text.trim() ? '#4f46e5' : '#e5e7eb', // indigo-600 : gray-200
            color: text.trim() ? 'white' : '#9ca3af',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: text.trim() ? '0 4px 6px -1px rgba(79, 70, 229, 0.3)' : 'none'
          }}
        >
          <Send size={18} style={{ marginLeft: text.trim() ? '2px' : '0' }} />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
