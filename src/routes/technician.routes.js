const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const technicianController = require('../controllers/technician.controller');

/**
 * Protected route - Technician profile
 */
router.get(
  '/profile',
  authMiddleware('technician'),
  technicianController.getProfile
);

/**
 * Protected route - Update Technician profile
 */
router.put(
  '/profile',
  authMiddleware('technician'),
  technicianController.updateProfile
);

/**
 * Technician dashboard
 */
router.get(
  '/requests/available',
  authMiddleware('technician'),
  technicianController.getAvailableRequests
);

router.get(
  '/requests/my',
  authMiddleware('technician'),
  technicianController.getTechnicianJobs
);


/**
 * Technician updates service status
 */
router.patch(
  '/requests/:request_id/status',
  authMiddleware('technician'),
  technicianController.updateServiceStatus
);

/**
 * Technician accepts request
 */

router.post(
  '/requests/:request_id/accept',
  authMiddleware('technician'),
  technicianController.acceptServiceRequest
);

console.log('Technician routes loaded');


module.exports = router;