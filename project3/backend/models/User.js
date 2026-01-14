const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    publicKey: {
        type: Object,
        required: true
    },
    displayName: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    backup: {
        type: {
            keychain: String, // Encrypted Keychain Blob
            digest: String,   // Integrity Digest
            timestamp: { type: Date, default: Date.now }
        },
        default: null
    }
});

module.exports = mongoose.model('User', UserSchema);
