const express = require('express');
const router = express.Router();
const connection = require('../models/db');

// Ensure session cart exists
function ensureCartSession(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
}

// Store Route
router.get('/store', async (req, res) => {
  try {
    const [results] = await connection.query('SELECT * FROM gear');
    const gear = results.map(item => ({
      ...item,
      price_per_unit: Number(item.price_per_unit)
    }));
    ensureCartSession(req);
    res.render('store', { gear, cart: req.session.cart });
  } catch (err) {
    console.error('Error fetching gear:', err);
    res.status(500).send('Database error');
  }
});

// Add item to cart
router.post('/cart/add/:id', async (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');

  try {
    const [results] = await connection.query('SELECT * FROM gear WHERE gear_id = ?', [gearId]);
    if (results.length === 0) return res.status(404).send('Item not found');

    const item = {
      ...results[0],
      price_per_unit: Number(results[0].price_per_unit)
    };

    ensureCartSession(req);
    const cart = req.session.cart;
    const existingItem = cart.find((c) => c.gear_id === gearId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }

    res.redirect('/store?success=true');
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).send('Database error');
  }
});

// View cart
router.get('/cart', (req, res) => {
  const isMember = req.session.user && req.session.user.role === 'member';
  ensureCartSession(req);
  res.render('cart', { cart: req.session.cart, isMember });
});

// Remove item from cart
router.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');

  ensureCartSession(req);
  req.session.cart = req.session.cart.filter(item => item.gear_id !== gearId);
  res.redirect('/cart');
});

// Update item quantity
router.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQuantity = parseInt(req.body.quantity, 10);
  if (isNaN(gearId) || isNaN(newQuantity) || newQuantity <= 0) {
    return res.status(400).send('Invalid input');
  }

  ensureCartSession(req);
  const item = req.session.cart.find(item => item.gear_id === gearId);
  if (item) item.quantity = newQuantity;
  res.redirect('/cart');
});

// Payment method page
router.get('/paymentmethod', async (req, res) => {
  const customerId = req.session.customerId;
  if (!customerId) return res.redirect('/login');

  try {
    const [results] = await connection.query('SELECT * FROM users WHERE id = ?', [customerId]);
    if (results.length === 0) return res.status(404).send('Customer not found');

    res.render('paymentmethod', { cart: req.session.cart || [], customer: results[0] });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).send('Database error');
  }
});

// Payment options page
router.get('/payment/options', async (req, res) => {
  const customerId = req.session.customerId;
  if (!customerId) return res.redirect('/login');

  try {
    const [results] = await connection.query('SELECT * FROM users WHERE id = ?', [customerId]);
    if (results.length === 0) return res.status(404).send('Customer not found');

    res.render('paymentoptions', { customer: results[0] });
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).send('Database error');
  }
});

// Payment processing
router.post('/payment/processing', (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const cart = req.session.cart || [];
  const userId = req.session.customerId || (req.session.user && req.session.user.id);

  if (!userId || cart.length === 0) {
    return res.status(400).send('Missing user or cart data.');
  }

  const orderData = {
    user_id: userId,
    order_date: new Date(),
    payment_method: paymentMethod
  };

  connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
    if (err) return res.status(500).send('Database error (order).');

    const orderId = orderResult.insertId;
    const orderItems = cart.map(item => [
      orderId,
      item.gear_id,
      item.quantity,
      item.price_per_unit || item.price
    ]);

    connection.query(
      'INSERT INTO order_item (order_id, gear_id, quantity, price_per_unit) VALUES ?',
      [orderItems],
      (err) => {
        if (err) return res.status(500).send('Database error (order items).');
        req.session.cart = [];
        res.redirect('/paymentsuccess');
      }
    );
  });
});

// Payment success page
// Save order after payment success
router.post('/paymentsuccess', (req, res) => {
  const { cart } = req.body;
  const userId = req.session.customerId || (req.session.user && req.session.user.id);

  if (!userId || !cart || cart.length === 0) {
    return res.status(400).json({ error: 'Missing user or cart data.' });
  }

  // Insert order
  const orderData = {
    user_id: userId,
    order_date: new Date(),
    payment_method: 'paypal'
  };

  connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
    if (err) return res.status(500).json({ error: 'Database error (order).' });

    const orderId = orderResult.insertId;
    const orderItems = cart.map(item => [
      orderId,
      item.gear_id,
      item.quantity,
      item.price_per_unit || item.price
    ]);

    connection.query(
      'INSERT INTO order_item (order_id, gear_id, quantity, price_per_unit) VALUES ?',
      [orderItems],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error (order items).' });
        // Optionally clear cart here: req.session.cart = [];
        res.json({ success: true });
      }
    );
  });
});

module.exports = router;