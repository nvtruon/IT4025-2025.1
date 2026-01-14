import { useState } from 'react';
import { MessageSquare, Lock, User } from 'lucide-react';

function LoginPanel({ isAuthenticated, username, onLogin, onLogout, loading, error }) {
    const [inputUsername, setInputUsername] = useState('');
    const [inputPassword, setInputPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputUsername.trim()) return;
        onLogin(inputUsername.trim(), inputPassword.trim());
    };

    if (isAuthenticated) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
                <img
                    src={`https://ui-avatars.com/api/?name=${username}&background=0D8ABC&color=fff`}
                    alt="Avatar"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '10px' }}
                />
                <h3>{username}</h3>
                <button
                    onClick={onLogout}
                    style={{
                        marginTop: '10px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{
            minHeight: '100vh',
            width: '100%', // Fix flex layout issue
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom right, #6366f1, #a855f7, #ec4899)' // indigo-500 via purple-500 to pink-500
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                padding: '40px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: '420px',
                transition: 'transform 0.3s'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        backgroundColor: '#4f46e5', // indigo-600
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        transform: 'rotate(3deg)'
                    }}>
                        <MessageSquare color="white" size={32} />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1f2937', margin: '0 0 8px 0' }}>Chat App</h2>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '15px' }}>Kết nối bảo mật với bạn bè</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                            Tên đăng nhập
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                <User size={20} />
                            </div>
                            <input
                                type="text"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 40px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    outline: 'none',
                                    backgroundColor: '#f9fafb',
                                    fontSize: '15px',
                                    transition: 'border-color 0.2s',
                                    color: '#1f2937'
                                }}
                                placeholder="Nhập tên đăng nhập (ID)"
                                value={inputUsername}
                                onChange={(e) => setInputUsername(e.target.value)}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                            Mật khẩu
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 40px',
                                    borderRadius: '12px',
                                    border: '1px solid #d1d5db',
                                    outline: 'none',
                                    backgroundColor: '#f9fafb',
                                    fontSize: '15px',
                                    transition: 'border-color 0.2s',
                                    color: '#1f2937'
                                }}
                                placeholder="Nhập mật khẩu (tùy chọn)"
                                value={inputPassword}
                                onChange={(e) => setInputPassword(e.target.value)}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            fontSize: '14px',
                            padding: '10px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            marginTop: '8px',
                            width: '100%',
                            backgroundColor: loading ? '#818cf8' : '#4f46e5',
                            backgroundImage: loading ? 'none' : 'linear-gradient(to right, #4f46e5, #6366f1)',
                            color: 'white',
                            fontWeight: '600',
                            padding: '14px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            transition: 'transform 0.1s'
                        }}
                        onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
                        onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {loading ? 'Đang kết nối...' : 'Bắt đầu trò chuyện'}
                    </button>
                </form>

                <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                    Secure Chat - End-to-End Encrypted
                </p>
            </div>
        </div>
    );
}

export default LoginPanel;
