const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/subscriptionService.controller');

router.post(
  '/create',
  auth('user'),
  ctrl.createServiceUsingSubscription
);

module.exports = router;
