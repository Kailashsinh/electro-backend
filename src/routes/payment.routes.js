const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const paymentController = require('../controllers/payment.controller');

// USER pays ₹200 visit fee
router.post(
  '/visit-fee',
  authMiddleware('user'),
  upload.array('issue_images', 4),
  paymentController.payVisitFee
);

module.exports = router;
