const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const feedbackController = require('../controllers/feedback.controller');

/* Submit feedback (User or Technician) */
router.post(
  '/:requestId',
  authMiddleware(['user', 'technician']),
  feedbackController.submitFeedback
);

/* TECHNICIAN views feedback */
router.get(
  '/technician/my',
  authMiddleware('technician'),
  feedbackController.getTechnicianFeedback
);

module.exports = router;
