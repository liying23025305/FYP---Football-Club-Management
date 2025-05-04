const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Payment page
router.get('/', paymentController.paymentPage);

// Stripe payment intent (future)
// router.post('/create-intent', paymentController.createStripeIntent);

module.exports = router; 