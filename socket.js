let io;
const socketAuth = require('./socketAuth');

module.exports = {
  init: (server) => {
    // Create socket.io instance 
    io = require('socket.io')(server, {
      cors: {
        origin: '*',
      },
    });

    // Apply authentication middleware, init pachi
    io.use(socketAuth);

    // Handle connections
    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      // Join chat room
      socket.on('join_chat', (requestId) => {
        socket.join(`chat_${requestId}`);
        console.log(`[SOCKET] User ${socket.user?.id} (${socket.user?.role}) joined room: chat_${requestId}`);
        console.log(`[SOCKET] Current rooms for ${socket.id}:`, Array.from(socket.rooms));
      });

      // Send message
      socket.on('send_message', async (data) => {
        const { requestId, content } = data;
        const senderId = socket.user?.id;
        const senderRole = socket.user?.role;
        console.log(`[SOCKET] send_msg from ${senderId} for room: chat_${requestId}`);
        if (!requestId || !content || !senderId) return;
        try {
          const chatController = require('./src/controllers/chat.controller');
          const savedMsg = await chatController.saveMessage(requestId, senderId, senderRole, content);
          console.log(`[SOCKET] Broadcasting new_message to chat_${requestId}`);
          io.to(`chat_${requestId}`).emit('new_message', savedMsg);
        } catch (error) {
          console.error('[SOCKET] send_message error:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized');
    }
    return io;
  },
};
