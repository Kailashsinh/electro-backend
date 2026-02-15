const jwt = require('jsonwebtoken');
const Technician = require('../models/Technician');

const authMiddleware = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          message: 'Authorization token missing',
        });
      }

      
      const token = authHeader.split(' ')[1];

      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(decoded.role)) {
          return res.status(403).json({
            message: 'Access denied',
          });
        }
      }

      if (decoded.role === 'technician') {
        const technician = await Technician.findById(decoded.id);

        if (!technician) {
          return res.status(401).json({
            message: 'Technician not found',
          });
        }

        
        if (
          technician.status === 'suspended' &&
          technician.suspended_until &&
          technician.suspended_until <= new Date()
        ) {
          technician.status = 'active';
          technician.loyalty_points = 100;
          technician.suspended_until = null;
          technician.is_available = true;

          await technician.save();
        }

        
        if (
          technician.status === 'suspended' &&
          technician.suspended_until &&
          technician.suspended_until > new Date()
        ) {
          return res.status(403).json({
            message: `Account suspended until ${technician.suspended_until.toDateString()}`,
          });
        }
      }

      
      next();
    } catch (error) {
      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }
  };
};

module.exports = authMiddleware;
