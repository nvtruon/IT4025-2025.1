import { useState } from 'react';
import { MessageSquare, User } from 'lucide-react';

function SetupNameModal({ username, defaultValue, onSave }) {
    const [name, setName] = useState(defaultValue || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        // Simulate brief delay or just call save
        onSave(name.trim());
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                animation: 'fadeIn 0.3s ease-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        backgroundColor: '#ec4899', // pink-500
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                        boxShadow: '0 10px 15px -3px rgba(236, 72, 153, 0.3)'
                    }}>
                        <User color="white" size={28} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
                        Chào {username}!
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '15px' }}>
                        Bạn muốn mọi người gọi bạn là gì?
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                <MessageSquare size={20} />
                            </div>
                            <input
                                type="text"
                                autoFocus
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên hiển thị của bạn..."
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 48px',
                                    borderRadius: '12px',
                                    border: '2px solid #e5e7eb',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#f9fafb'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#ec4899';
                                    e.target.style.backgroundColor = 'white';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.backgroundColor = '#f9fafb';
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim() || loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#ec4899',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: (!name.trim() || loading) ? 'not-allowed' : 'pointer',
                            opacity: (!name.trim() || loading) ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(236, 72, 153, 0.4)'
                        }}
                    >
                        {loading ? 'Đang lưu...' : 'Bắt đầu ngay'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SetupNameModal;
