import React from 'react';

function UserList({ users, selectedUser, onSelectUser }) {
  const avatarUrl = (name) => `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {users.map((user) => {
        const isSelected = selectedUser === user.username;
        const online = user.status === 'online';
        const display = user.displayName || user.username;

        return (
          <div
            key={user.username}
            onClick={() => onSelectUser(user.username)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: isSelected ? '#eff6ff' : 'transparent', // indigo-50
              boxShadow: isSelected ? '0 1px 2px 0 rgba(0,0,0,0.05)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={avatarUrl(display)}
                alt={display}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
              {online && (
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#22c55e', // green-500
                  border: '2px solid white',
                  borderRadius: '50%'
                }}></span>
              )}
            </div>
            <div style={{ marginLeft: '12px', flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: isSelected ? '#4338ca' : '#1f2937', // indigo-700 : gray-800
                  margin: 0
                }}>
                  {display}
                </h4>
                {/* Time placeholder */}
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>now</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '120px',
                  margin: 0
                }}>
                  Nhấn để trò chuyện
                </p>
                {/* Unread badge placeholder 
                <span style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  1
                </span>
                */}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default UserList;
