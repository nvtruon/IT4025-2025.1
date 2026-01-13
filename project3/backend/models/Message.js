const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true,
        index: true
    },
    recipient: {
        type: String,
        required: true,
        index: true
    },
    // Encrypted Payload - Server CANNOT decrypt this
    // It contains the 'header' (for ratchet) and 'ciphertext'
    payload: {
        header: Object,
        ciphertext: String // Base64 encoded encrypted string
    },
    delivered: {
        type: Boolean,
        default: false,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Message', MessageSchema);
