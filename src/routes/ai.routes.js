const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true, 
    legacyHeaders: false, 
});

router.post('/diagnose', aiLimiter, aiController.diagnose);

module.exports = router;
