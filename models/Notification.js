const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    senderEmail: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['delivered', 'pending', 'failed'], default: 'pending' }
});

module.exports = mongoose.model('Notification', notificationSchema);
