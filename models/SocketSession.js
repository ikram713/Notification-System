const mongoose = require('mongoose');

const socketSessionSchema = new mongoose.Schema({
    email: { type: String, required: true },
    socketId: { type: String, required: true },
    connected: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SocketSession', socketSessionSchema);
