const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = {
      id: decoded.id,
      role: decoded.role,
    };

    socket.join(decoded.id); // personal room create karse 

    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};
