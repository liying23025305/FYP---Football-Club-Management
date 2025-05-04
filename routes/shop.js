const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// Shop home page
router.get('/', shopController.shopHome);

// Product details
router.get('/product/:id', shopController.productDetail);

// Cart page
router.get('/cart', shopController.cartPage);

module.exports = router; 