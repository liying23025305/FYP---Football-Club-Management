const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');

// Calendar home page
router.get('/', calendarController.calendarHome);

module.exports = router; 