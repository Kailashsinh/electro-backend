const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const subscriptionController = require('../controllers/subscription.controller');

/**
 * USER buys a subscription (Premium / Premium Pro)
 */
router.post(
  '/buy',
  authMiddleware('user'),
  subscriptionController.buySubscription
);

/**
 * USER views active subscription
 */
router.get(
  '/my',
  authMiddleware('user'),
  subscriptionController.getMySubscription
);

module.exports = router;