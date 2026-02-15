const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

/*
|--------------------------------------------------------------------------
| USER AUTH ROUTES
|--------------------------------------------------------------------------
*/
// USER AUTH ROUTES
router.post('/user/register', authController.registerUser);
router.post('/user/verify-email', authController.verifyEmailUser);
router.post('/user/resend-verification', authController.resendVerificationUser);
router.post('/user/login', authController.loginUser);
router.post('/user/forgot-password', authController.forgotPasswordUser);
router.post('/user/reset-password', authController.resetPasswordUser);

/*
|--------------------------------------------------------------------------
| TECHNICIAN AUTH ROUTES
|--------------------------------------------------------------------------
*/
router.post('/technician/register', authController.registerTechnician);
router.post('/technician/verify-email', authController.verifyEmailTechnician);
router.post('/technician/resend-verification', authController.resendVerificationTechnician);
router.post('/technician/login', authController.loginTechnician);
router.post('/technician/forgot-password', authController.forgotPasswordTechnician);
router.post('/technician/reset-password', authController.resetPasswordTechnician);

/*
|--------------------------------------------------------------------------
| ADMIN AUTH ROUTES (login only)
|--------------------------------------------------------------------------
*/
router.post('/admin/login', authController.loginAdmin);

module.exports = router;