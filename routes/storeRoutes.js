const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// Update credentials for XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // default for XAMPP
  database: 'mydb'
});

// Ensure session cart exists
function ensureCartSession(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
}

// Show store page
router.get('/store', async (req, res) => {
  try {
    const [results] = await connection.promise().query('SELECT * FROM gear');
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
    const [results] = await connection.promise().query('SELECT * FROM gear WHERE gear_id = ?', [gearId]);
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
  let isMember = false;
  if (req.session.user && req.session.user.role === 'member') {
    isMember = true;
  }
  res.render('cart', { cart: req.session.cart || [], isMember });
});

// Update cart item quantity
router.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQty = parseInt(req.body.quantity, 10);
  ensureCartSession(req);
  const item = req.session.cart.find(i => i.gear_id === gearId);
  if (item && newQty > 0) {
    item.quantity = newQty;
  }
  res.redirect('/cart');
});

// Remove item from cart
router.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  ensureCartSession(req);
  req.session.cart = req.session.cart.filter(i => i.gear_id !== gearId);
  res.redirect('/cart');
});

// Checkout page
router.get('/payment', (req, res) => {
  const cart = req.session.cart || [];
  const customer = req.session.user;
  if (!customer) return res.redirect('/login');
  if (cart.length === 0) return res.redirect('/cart');

  connection.query('SELECT payment_mode_id, name FROM payment_mode', (err, paymentModes) => {
    if (err) {
      console.error('DB error in /payment:', err);
      return res.status(500).send('Database error');
    }
    res.render('payment', { cart, customer, paymentModes });
  });
});

// Payment processing (form submit)
router.post('/payment/process', async (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const cart = req.session.cart || [];
  const user = req.session.user;
  if (!user || cart.length === 0) {
    return res.status(400).send('Missing user or cart data.');
  }

  const account_id = user.account_id;

  try {
    // Find payment_mode_id
    const [pmResults] = await connection.promise().query(
      'SELECT payment_mode_id FROM payment_mode WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [paymentMethod]
    );
    if (pmResults.length === 0) {
      return res.status(400).send('Payment mode not found. Please select a valid payment method.');
    }
    const payment_mode_id = pmResults[0].payment_mode_id;

    // Insert order
    const [orderResult] = await connection.promise().query(
      'INSERT INTO `order` (order_date, payment_ref, account_id, payment_mode_id) VALUES (?, ?, ?, ?)',
      [new Date(), 'manual', account_id, payment_mode_id]
    );
    const order_id = orderResult.insertId;

    // For each cart item, create a transaction_detail and then order_item
    for (const item of cart) {
      const [tdResult] = await connection.promise().query(
        'INSERT INTO transaction_detail (transaction_type, transaction_date, amount) VALUES (?, ?, ?)',
        ['football gear purchase', new Date(), item.price_per_unit * item.quantity]
      );
      const transaction_id = tdResult.insertId;
      await connection.promise().query(
        'INSERT INTO order_item (quantity, order_id, gear_id, transaction_id) VALUES (?, ?, ?, ?)',
        [item.quantity, order_id, item.gear_id, transaction_id]
      );
    }

    // Update total_amount in payment_mode
    const orderTotal = cart.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);
    await connection.promise().query(
      'UPDATE payment_mode SET total_amount = IFNULL(total_amount,0) + ? WHERE payment_mode_id = ?',
      [orderTotal, payment_mode_id]
    );

    req.session.cart = [];
    res.redirect('/paymentsuccess');
  } catch (err) {
    console.error('DB error in payment processing:', err);
    res.status(500).send('Database error (order).');
  }
});

// Payment success page
router.get('/paymentsuccess', (req, res) => {
  res.render('paymentsuccess');
});

module.exports = router;
