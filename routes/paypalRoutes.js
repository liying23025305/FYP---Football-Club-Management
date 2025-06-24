const express = require('express');
const router = express.Router();
const connection = require('../models/db');
const paypal = require('@paypal/checkout-server-sdk');

// Set up PayPal environment (use your sandbox credentials)
const clientId = process.env.PAYPAL_CLIENT_ID || 'YOUR_SANDBOX_CLIENT_ID';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_SANDBOX_CLIENT_SECRET';
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// Create PayPal order
router.post('/api/orders', async (req, res) => {
  try {
    const { cart } = req.body;
    let total = 0;
    for (const item of cart) {
      const [rows] = await connection.execute('SELECT price_per_unit FROM gear WHERE gear_id = ?', [item.id]);
      if (!rows.length) return res.status(400).json({ error: 'Invalid gear ID' });
      total += parseFloat(rows[0].price_per_unit) * (item.quantity || 1);
    }
    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: total.toFixed(2)
        }
      }]
    });
    const order = await client.execute(request);
    res.json({ id: order.result.id, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order creation failed' });
  }
});

// Capture PayPal order
router.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await client.execute(request);
    // TODO: Insert order into DB (orders, order_items) after successful capture
    res.json(capture.result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order capture failed' });
  }
});

module.exports = router;
