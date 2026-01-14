"use strict";
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

// Models
const User = require('./models/User');
const Message = require('./models/Message');

// Configuration
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/secure_chat';

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

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log(`✅ Connected to MongoDB at ${MONGO_URI.includes('localhost') ? 'Localhost' : 'Remote'}`))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// Map socket IDs to usernames for quick lookup (Active Sessions only)
const socketToUser = new Map();

// Helper: Get socket ID for a username
const getUserSocket = async (username) => {
  for (const [id, name] of socketToUser.entries()) {
    if (name === username) return id;
  }
  return null;
};

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Register user with public key
  socket.on('register', async (data) => {
    const { username, publicKey, displayName } = data;

    console.log(`[DEBUG] Register request for ${username ? username.substring(0, 8) : 'unknown'}...`);
    console.log(`[DEBUG] Payload displayName: "${displayName}" (Type: ${typeof displayName})`);

    if (!username || !publicKey) {
      socket.emit('error', { message: 'Username and publicKey are required' });
      return;
    }

    try {
      // 1. Upsert User in MongoDB (Persistent Identity)
      const updateData = { publicKey, lastActive: new Date() };
      if (displayName) {
        updateData.displayName = displayName;
      }

      // If creating new user and no displayName, it will be undefined (schema default might handle it or it stays missing)
      // Actually schema default is ''.
      // We want to preserve existing name if displayName is null/undefined in request.

      const userDoc = await User.findOneAndUpdate(
        { username },
        { $set: updateData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // 2. Update Active Session Map
      socketToUser.set(socket.id, username);

      console.log(`User registered: ${username} (DB Updated)`);
      socket.emit('register_success', {
        message: 'Registration successful',
        displayName: userDoc.displayName || ''
      });

      // 3. Broadcast updated user list
      const allUsers = await User.find({}, 'username publicKey displayName');
      const onlineUsernames = new Set(socketToUser.values());
      const onlineUsers = allUsers.filter(u => onlineUsernames.has(u.username));
      io.emit('users_list', { users: onlineUsers });

      // 4. [ZK Message Sync] Check for pending messages
      const pendingMessages = await Message.find({
        recipient: username,
        delivered: false
      }).sort({ timestamp: 1 });

      if (pendingMessages.length > 0) {
        console.log(`Found ${pendingMessages.length} pending messages for ${username}`);
        for (const msg of pendingMessages) {
          socket.emit('message', {
            sender: msg.sender,
            payload: msg.payload // Encrypted Blob
          });
          msg.delivered = true;
          await msg.save();
        }
      }

    } catch (err) {
      console.error('Registration error:', err);
      // socket.emit('error', { message: 'Registration failed due to server error' });
    }
  });

  // Get list of all users
  socket.on('get_users', async () => {
    try {
      const allUsers = await User.find({}, 'username publicKey displayName');
      const onlineUsernames = new Set(socketToUser.values());
      const onlineUsers = allUsers.filter(u => onlineUsernames.has(u.username));
      socket.emit('users_list', { users: onlineUsers });
    } catch (err) {
      console.error('Get users error:', err);
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
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

    try {
      // 1. Check Recipient
      const recipientUser = await User.findOne({ username: recipient });
      if (!recipientUser) {
        socket.emit('error', { message: 'Recipient not found in directory' });
        return;
      }

      // 2. Routing
      const recipientSocketId = await getUserSocket(recipient);

      // 3. Save ZK Payload
      const newMessage = new Message({
        sender,
        recipient,
        payload,
        delivered: !!recipientSocketId
      });
      await newMessage.save();

      // 4. Forward if Online
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message', {
          sender: sender,
          payload: payload
        });
        console.log(`Message forwarded from ${sender} to ${recipient} (Online)`);
      } else {
        console.log(`Message stored for ${recipient} (Offline)`);
      }

      socket.emit('send_success', { message: 'Message sent/queued successfully' });

    } catch (err) {
      console.error('Send message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle disconnection
  // --- CLOUD BACKUP EVENTS ---

  socket.on('save_backup', async (data) => {
    const { username, keychain, digest } = data;
    if (!username || !keychain || !digest) return;

    try {
      await User.findOneAndUpdate(
        { username },
        {
          backup: {
            keychain,
            digest,
            timestamp: new Date()
          }
        }
      );
      // console.log(`Backup saved for ${username}`);
    } catch (err) {
      console.error(`Backup save failed for ${username}:`, err);
    }
  });

  socket.on('restore_backup', async (data) => {
    const { username } = data;
    try {
      const user = await User.findOne({ username });
      if (user && user.backup) {
        socket.emit('backup_restored', user.backup);
        console.log(`Backup restored for ${username}`);
      } else {
        socket.emit('backup_not_found');
      }
    } catch (err) {
      console.error(`Backup restore failed for ${username}:`, err);
    }
  });

  socket.on('disconnect', () => {
    const username = socketToUser.get(socket.id);
    if (username) {
      socketToUser.delete(socket.id);
      console.log(`User disconnected: ${username}`);
    } else {
      console.log(`Client disconnected: ${socket.id}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Secure/ZK Relay server running on port ${PORT}`);
  console.log(`Connect to MongoDB at ${MONGO_URI.includes('localhost') ? 'Localhost' : 'Cloud Atlas'}`);
});
