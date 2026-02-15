const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

console.log('authMiddleware:', authMiddleware);
console.log('getProfile:', userController.getProfile);

/**
 * Protected route - Get logged-in user profile
 */
router.get('/profile', authMiddleware('user'), userController.getProfile);

/**
 * Protected route - Update logged-in user profile
 */
router.put('/profile', authMiddleware('user'), userController.updateProfile);

/**
 * Protected route - Change password
 */
router.put('/password', authMiddleware('user'), userController.changePassword);

module.exports = router;