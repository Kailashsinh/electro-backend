const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/admin.middleware'); // Reusing the admin middleware as auth

// Protect all routes with admin middleware
router.use(authMiddleware);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Users
router.get('/users', adminController.getAllUsers);

// Technicians
router.get('/technicians', adminController.getAllTechnicians);
router.patch('/technicians/:id/verify', adminController.verifyTechnician);
router.get('/technicians/payouts', adminController.getTechnicianPayouts);

// Appliances
router.get('/appliances', adminController.getAllAppliances);
router.delete('/appliances/:id', authMiddleware, adminController.deleteAppliance);

// Service Requests
router.get('/requests', adminController.getAllServiceRequests);

// Reports
router.get('/reports', authMiddleware, adminController.getReportData);

// CRUD
router.put('/users/:id', authMiddleware, adminController.updateUser);
router.delete('/users/:id', authMiddleware, adminController.deleteUser);

router.put('/technicians/:id', authMiddleware, adminController.updateTechnician);
router.delete('/technicians/:id', authMiddleware, adminController.deleteTechnician);

router.delete('/requests/:id', authMiddleware, adminController.deleteServiceRequest);

module.exports = router;