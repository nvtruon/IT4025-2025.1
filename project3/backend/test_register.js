const { io } = require('socket.io-client');
const crypto = require('crypto');

const socket = io('http://localhost:3001');

socket.on('connect', async () => {
    console.log('Connected to server');

    // Simulate a User
    const username = crypto.createHash('sha256').update('testUserDefaults').digest('hex');
    const publicKey = { kty: 'EC', crv: 'P-384', x: 'test', y: 'test' }; // Dummy key
    const displayName = 'Test Display Name';

    console.log(`Registering ${username.substring(0, 8)} with name "${displayName}"`);

    socket.emit('register', {
        username,
        publicKey,
        displayName
    });
});

socket.on('register_success', (data) => {
    console.log('✅ Registration Success:', data);
    socket.disconnect();
});

socket.on('error', (err) => {
    console.error('❌ Error:', err);
    socket.disconnect();
});
