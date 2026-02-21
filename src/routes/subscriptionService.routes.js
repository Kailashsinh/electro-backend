const router = require('express').Router();
const auth = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const ctrl = require('../controllers/subscriptionService.controller');

router.post(
  '/create',
  auth('user'),
  upload.array('issue_images', 4),
  ctrl.createServiceUsingSubscription
);

module.exports = router;
