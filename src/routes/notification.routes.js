const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

/* Get notifications */
router.get(
  '/',
  authMiddleware(),
  notificationController.getMyNotifications
);

/* Mark notification as read */
router.patch(
  '/:notificationId/read',
  authMiddleware(),
  notificationController.markAsRead
);

module.exports = router;
