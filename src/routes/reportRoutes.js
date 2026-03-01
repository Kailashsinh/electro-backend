const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const adminAuth = require('../middlewares/admin.middleware');

// All report routes require admin access
router.use(adminAuth);

router.get('/revenue', reportController.getRevenueReport);
router.get('/users', reportController.getUserRosterReport);
router.get('/technicians', reportController.getTechnicianPerformanceReport);

module.exports = router;
