import { useState } from 'react';

const styles = {
    container: {
        padding: '20px',
        borderBottom: '4px solid #000',
        backgroundColor: '#45283c', // contrast header
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        marginTop: 0,
        marginBottom: '15px',
        fontSize: '24px',
        color: '#fbf236', // yellow
        textAlign: 'center',
        textShadow: '2px 2px #000'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    error: {
        color: '#ac3232',
        fontSize: '16px',
        marginTop: '5px',
        fontWeight: 'bold'
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px'
    },
    avatar: {
        width: '40px',
        height: '40px',
        backgroundColor: '#66ccff',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        marginRight: '15px',
        border: '4px solid #000',
        boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.5)'
    },
    userDetails: {
        display: 'flex',
        flexDirection: 'column'
    },
    welcomeLabel: {
        fontSize: '14px',
        color: '#8f9799'
    },
    usernameLabel: {
        fontWeight: 'bold',
        fontSize: '20px',
        color: '#fff'
    },
    logoutButton: {
        width: '100%'
    }
};

// Update component JSX to use new classes
function LoginPanel({ isAuthenticated, username, onLogin, onLogout, loading, error }) {
    const [localUsername, setLocalUsername] = useState('');
    const [localPassword, setLocalPassword] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [serverUrl, setServerUrl] = useState(localStorage.getItem('chat_server_url') || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(localUsername, localPassword);
    };

    const handleServerUrlChange = (e) => {
        const url = e.target.value;
        setServerUrl(url);
        if (url) {
            localStorage.setItem('chat_server_url', url);
        } else {
            localStorage.removeItem('chat_server_url');
        }
    };

    if (isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.userInfo}>
                    <div style={styles.avatar}>
                        {username ? username.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div style={styles.userDetails}>
                        <div style={styles.welcomeLabel}>WELCOME</div>
                        <div style={styles.usernameLabel}>{username}</div>
                    </div>
                </div>
                <button onClick={onLogout} className="pixel-btn danger" style={styles.logoutButton}>
                    LOGOUT
                </button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>SECURE TERMINAL</h3>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    className="pixel-input"
                    type="text"
                    placeholder="USERNAME"
                    value={localUsername}
                    onChange={(e) => setLocalUsername(e.target.value)}
                    required
                    disabled={loading}
                />
                <input
                    className="pixel-input"
                    type="password"
                    placeholder="PASSWORD"
                    value={localPassword}
                    onChange={(e) => setLocalPassword(e.target.value)}
                    required
                    disabled={loading}
                />

                {/* Reset Local Data Button REMOVED as per Cloud Transport requirement */}

                {error && <div style={styles.error}>ERROR: {error}</div>}

                <button
                    type="submit"
                    className="pixel-btn"
                    style={{ marginTop: '10px' }}
                    disabled={loading}
                >
                    {loading ? 'LOADING...' : 'START'}
                </button>

            </form>
        </div>
    );
}

export default LoginPanel;
