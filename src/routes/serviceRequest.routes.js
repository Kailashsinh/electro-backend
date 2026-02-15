const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const serviceRequestController = require('../controllers/serviceRequest.controller');


/* =====================================================
   USER ROUTES
===================================================== */

/* User views own service requests */
router.get(
  '/my',
  authMiddleware('user'),
  serviceRequestController.getMyServiceRequests
);


/* USER cancels service */
router.post(
  '/:requestId/cancel',
  authMiddleware('user'),
  serviceRequestController.cancelByUser
);

/* TECHNICIAN cancels service */
router.patch(
  '/:requestId/cancel',
  authMiddleware('technician'),
  serviceRequestController.cancelByTechnician
);

/* User approves estimate */
router.post(
  '/:requestId/approve',
  authMiddleware('user'),
  serviceRequestController.approveEstimate
);

/* Technician verifies OTP & closes service */
router.post(
  '/:requestId/verify-otp',
  authMiddleware('technician'),
  serviceRequestController.verifyOtpAndPay
);

/* =====================================================
   TECHNICIAN ROUTES
===================================================== */

/* Technician accepts service request */
router.post(
  '/:requestId/accept',
  authMiddleware('technician'),
  serviceRequestController.acceptServiceRequest
);

/* Technician starts travel */
router.patch(
  '/:requestId/on-the-way',
  authMiddleware('technician'),
  serviceRequestController.markOnTheWay
);

/* Technician submits cost estimate */
router.patch(
  '/:requestId/estimate',
  authMiddleware('technician'),
  serviceRequestController.submitEstimate
);

/* Technician completes service (OTP generated) */
router.post(
  '/:requestId/complete',
  authMiddleware('technician'),
  serviceRequestController.completeService
);

/* Technician views assigned/broadcasted requests */
router.get(
  '/technician',
  authMiddleware('technician'),
  serviceRequestController.getTechnicianRequests
);

module.exports = router;
