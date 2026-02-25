const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technician.controller');
const upload = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

router.post(
  '/upload-documents',
  authMiddleware('technician'),
  upload.fields([
    { name: 'id_proof', maxCount: 1 },
    { name: 'live_photo', maxCount: 1 },
    { name: 'certification', maxCount: 1 }
  ]),
  technicianController.uploadVerificationDocuments
);

router.get('/profile', authMiddleware('technician'), technicianController.getProfile);
router.patch('/location', authMiddleware('technician'), technicianController.updateLocation);

// Payout Settings (Secure)
router.get('/payout-settings', authMiddleware('technician'), technicianController.getPayoutSettings);
router.patch('/payout-settings', authMiddleware('technician'), technicianController.updatePayoutSettings);

module.exports = router;