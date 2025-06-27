const express = require('express');
const router = express.Router();
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
    // Calculate total from cart (you may want to validate items/prices here)
    let total = 0;
    let items = [];
    for (const item of cart) {
      // You can fetch item details from DB if needed
      items.push({
        name: item.name,
        unit_amount: {
          currency_code: 'USD',
          value: Number(item.price).toFixed(2)
        },
        quantity: String(item.quantity || 1),
        description: item.description || '',
        sku: item.sku || ''
      });
      total += Number(item.price) * (item.quantity || 1);
    }
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: total.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: total.toFixed(2)
            }
          }
        },
        items
      }]
    });
    const order = await client.execute(request);
    res.status(201).json({ id: order.result.id, total });
  } catch (err) {
    console.error('Failed to create order:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// Capture PayPal order
router.post('/api/orders/:orderID/capture', async (req, res) => {
  try {
    const { orderID } = req.params;
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await client.execute(request);
    res.status(200).json(capture.result);
  } catch (err) {
    console.error('Failed to capture order:', err);
    res.status(500).json({ error: 'Failed to capture order.' });
  }
});

module.exports = router;