const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    request_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceRequest',
        required: true,
    },
    sender_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    sender_role: {
        type: String,
        enum: ['user', 'technician'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Message', MessageSchema);
