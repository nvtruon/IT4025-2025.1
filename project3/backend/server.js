"use strict";

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for users
// Format: { username: { publicKey: string, socketId: string } }
const users = new Map();

// Map socket IDs to usernames for quick lookup
const socketToUser = new Map();

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Register user with public key
  socket.on('register', (data) => {
    const { username, publicKey } = data;

    if (!username || !publicKey) {
      socket.emit('error', { message: 'Username and publicKey are required' });
      return;
    }

    // Check if username is already taken
    if (users.has(username)) {
      socket.emit('error', { message: `Username '${username}' is already taken by another active user.` });
      return;
    }

    // Store user information
    users.set(username, {
      publicKey: publicKey,
      socketId: socket.id
    });

    socketToUser.set(socket.id, username);

    console.log(`User registered: ${username}`);
    socket.emit('register_success', { message: 'Registration successful' });

    // Broadcast updated user list to all clients
    const userList = Array.from(users.entries()).map(([u, d]) => ({
      username: u,
      publicKey: d.publicKey
    }));
    io.emit('users_list', { users: userList });
  });

  // Get list of all users
  socket.on('get_users', () => {
    const userList = Array.from(users.entries()).map(([username, data]) => ({
      username: username,
      publicKey: data.publicKey
    }));

    socket.emit('users_list', { users: userList });
  });

  // Send message (forward encrypted payload to recipient)
  socket.on('send_message', (data) => {
    const { recipient, payload } = data;

    if (!recipient || !payload) {
      socket.emit('error', { message: 'Recipient and payload are required' });
      return;
    }

    const sender = socketToUser.get(socket.id);
    if (!sender) {
      socket.emit('error', { message: 'You must be registered to send messages' });
      return;
    }

    const recipientData = users.get(recipient);
    if (!recipientData) {
      socket.emit('error', { message: 'Recipient not found' });
      return;
    }

    // Forward the encrypted payload to the recipient
    io.to(recipientData.socketId).emit('message', {
      sender: sender,
      payload: payload
    });

    console.log(`Message forwarded from ${sender} to ${recipient}`);
    socket.emit('send_success', { message: 'Message sent successfully' });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = socketToUser.get(socket.id);
    if (username) {
      users.delete(username);
      socketToUser.delete(socket.id);
      console.log(`User disconnected: ${username}`);

      // Broadcast updated user list to all clients
      const userList = Array.from(users.entries()).map(([u, d]) => ({
        username: u,
        publicKey: d.publicKey
      }));
      io.emit('users_list', { users: userList });
    } else {
      console.log(`Client disconnected: ${socket.id}`);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
});

