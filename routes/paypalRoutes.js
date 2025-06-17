const express = require('express');
const router = express.Router();
const connection = require('../models/db');

// Create PayPal order
router.post('/api/orders', async (req, res) => {
  try {
    const { cart } = req.body;
    // Calculate total amount from cart
    let total = 0;
    for (const item of cart) {
      // Get price from DB for each gear item
      const [rows] = await connection.execute('SELECT price_per_unit FROM gear WHERE gear_id = ?', [item.id]);
      if (!rows.length) return res.status(400).json({ error: 'Invalid gear ID' });
      total += parseFloat(rows[0].price_per_unit) * (item.quantity || 1);
    }
    // Here you would create the order with PayPal SDK (server-side REST API)
    // For demo, we'll just return a fake order ID
    // In production, integrate with PayPal and store order in DB
    res.json({ id: 'FAKE_PAYPAL_ORDER_ID', total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// Capture PayPal order
router.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    // Here you would capture the order with PayPal SDK (server-side REST API)
    // For demo, we'll just simulate a successful capture
    // In production, verify/capture with PayPal and update DB
    // Example: Insert order into DB (orders, order_items)
    // ...
    res.json({ status: 'COMPLETED', id: orderID, purchase_units: [{ payments: { captures: [{ id: orderID, status: 'COMPLETED' }] } }] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order capture failed' });
  }
});

module.exports = router;
