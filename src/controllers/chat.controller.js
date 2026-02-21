const Message = require('../models/Message');

exports.getChatHistory = async (req, res) => {
    try {
        const { requestId } = req.params;
        const messages = await Message.find({ request_id: requestId }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.saveMessage = async (requestId, senderId, senderRole, content) => {
    try {
        console.log(`[CHAT_CTRL] Attempting to save message from ${senderId} for request ${requestId}`);
        const newMessage = new Message({
            request_id: requestId,
            sender_id: senderId,
            sender_role: senderRole,
            content,
        });
        await newMessage.save();
        console.log(`[CHAT_CTRL] Message saved successfully with ID: ${newMessage._id}`);
        return newMessage;
    } catch (error) {
        console.error('[CHAT_CTRL] Error saving message:', error);
        throw error;
    }
};
