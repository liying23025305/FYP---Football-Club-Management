const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated } = require('../middleware/auth');

// Admin dashboard
router.get('/dashboard', ensureAuthenticated, adminController.dashboard);

module.exports = router; 