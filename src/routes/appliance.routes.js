const express = require('express');
const router = express.Router();

const {
  registerAppliance,
  getMyAppliances,
  searchCategories,
  searchBrands,
  searchModels,
} = require('../controllers/appliance.controller');

const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Register appliance (user only)
 */
router.post(
  '/',
  authMiddleware('user'),
  registerAppliance
);

/**
 * Get logged-in user's appliances
 */
router.get(
  '/my',
  authMiddleware('user'),
  getMyAppliances
);

/**
 * Search Routes
 */
router.get('/categories', authMiddleware('user'), searchCategories);
router.get('/brands', authMiddleware('user'), searchBrands);
router.get('/models', authMiddleware('user'), searchModels);


module.exports = router;