const express = require('express');
const router = express.Router();
const connection = require('../models/db');

// Store Route
router.get('/store', (req, res) => {
  connection.query('SELECT * FROM gear', (err, results) => {
    if (err) {
      console.error('Error fetching gear:', err);
      return res.status(500).send('Database error');
    }
    // Convert price_per_unit to a number for each item
    const gear = results.map(item => ({
      ...item,
      price_per_unit: Number(item.price_per_unit)
    }));
    const cart = req.session.cart || [];
    res.render('store', { gear, cart });
  });
});

// Add item to cart
router.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');
  connection.query('SELECT * FROM gear WHERE gear_id = ?', [gearId], (err, results) => {
    if (err || results.length === 0) return res.status(404).send('Item not found');
    const item = results[0];
    item.price_per_unit = Number(item.price_per_unit);

    // Use session cart
    const cart = req.session.cart;

    const existingItem = cart.find((c) => c.gear_id === gearId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }

    res.redirect('/store?success=true');
  });
});

// View cart
router.get('/cart', (req, res) => {
  const isMember = req.session.user && req.session.user.role === 'member';
  const cart = req.session.cart || [];
  res.render('cart', { cart, isMember });
});

// Remove item from cart
router.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');

  // Ensure the cart exists in the session
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Remove the item from the session cart
  req.session.cart = req.session.cart.filter((item) => item.gear_id !== gearId);
  res.redirect('/cart');
});

// Update item quantity
router.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQuantity = parseInt(req.body.quantity, 10);
  if (isNaN(gearId) || isNaN(newQuantity) || newQuantity <= 0) {
    return res.status(400).send('Invalid input');
  }
  if (!req.session.cart) req.session.cart = [];
  const item = req.session.cart.find((item) => item.gear_id === gearId);
  if (item) item.quantity = newQuantity;
  res.redirect('/cart');
});


// Payment method page (fetch customer from DB)
router.get('/paymentmethod', (req, res) => {
  const cart = req.session.cart || [];
  const customerId = req.session.customerId || 1; // Replace with real session logic

  connection.query('SELECT * FROM users WHERE id = ?', [customerId], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error fetching customer:', err);
      return res.status(500).send('Customer not found');
    }
    const customer = results[0];
    res.render('paymentmethod', { cart, customer });
  });
});

// Payment options page (fetch customer from DB)
router.get('/payment/options', (req, res) => {
  const customerId = req.session.customerId || 1; // Replace with real session logic

  connection.query('SELECT * FROM users WHERE id = ?', [customerId], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error fetching customer:', err);
      return res.status(500).send('Customer not found');
    }
    const customer = results[0];
    res.render('paymentoptions', { customer });
  });
});

router.post('/payment/processing', (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const savePaymentMethod = req.body.savePaymentMethod === 'true';
  const cart = req.session.cart || [];
  const customerId = req.session.customerId;
  if (!customerId) return res.redirect('/login');
  if (cart.length === 0) return res.status(400).send('Cart is empty');

  // Insert order
  const orderData = {
    user_id: customerId,
    order_date: new Date(),
    payment_method: paymentMethod
  };

  connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
    if (err) {
      console.error('Error creating order:', err);
      return res.status(500).send('Database error');
    }
    const orderId = orderResult.insertId;
    const orderItems = cart.map(item => [
      orderId,
      item.gear_id,
      item.quantity,
      item.price_per_unit
    ]);
    connection.query(
      'INSERT INTO order_item (order_id, gear_id, quantity, price_per_unit) VALUES ?',
      [orderItems],
      (err) => {
        if (err) {
          console.error('Error inserting order items:', err);
          return res.status(500).send('Database error');
        }
        // Clear cart after successful order
        req.session.cart = [];
        res.redirect('/payment/success');
      }
    );
  });
});

// Payment success page
router.get('/payment/success', (req, res) => {
  res.render('paymentsuccess');
});

module.exports = router;