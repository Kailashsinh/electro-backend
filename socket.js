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
