const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const mysql = require('mysql2');

// Update credentials for XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // default for XAMPP
  database: 'mydb'
});

// Show store page
router.get('/store', (req, res) => {
  connection.query('SELECT * FROM gear', (err, results) => {
    if (err) {
      console.error('DB error in /store:', err);
      return res.status(500).send('Database error');
    }
    res.render('store', { gear: results, cart: req.session.cart || [] });
  });
});

// Add item to cart
router.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  connection.query('SELECT * FROM gear WHERE gear_id = ?', [gearId], (err, results) => {
    if (err || results.length === 0) {
      console.error('DB error or item not found in /cart/add:', err);
      return res.status(404).send('Item not found');
    }
    const item = results[0];

    if (!req.session.cart) req.session.cart = [];

    const existing = req.session.cart.find(i => i.gear_id === gearId);
    if (existing) {
      existing.quantity += 1;
    } else {
      req.session.cart.push({
        gear_id: item.gear_id,
        gear_name: item.gear_name,
        gear_desc: item.gear_desc,
        price_per_unit: item.price_per_unit,
        quantity: 1
      });
    }
    res.redirect('/store');
  });
=======
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
>>>>>>> 2e3885d00580b9610447a4e0850ac5c60840c201
});

// View cart
router.get('/cart', (req, res) => {
<<<<<<< HEAD
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
  if (!req.session.cart) req.session.cart = [];
  const item = req.session.cart.find(i => i.gear_id === gearId);
  if (item && newQty > 0) {
    item.quantity = newQty;
  }
  res.redirect('/cart');
=======
  const isMember = req.session.user && req.session.user.role === 'member';
  ensureCartSession(req);
  res.render('cart', { cart: req.session.cart, isMember });
>>>>>>> 2e3885d00580b9610447a4e0850ac5c60840c201
});

// Remove item from cart
router.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
<<<<<<< HEAD
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter(i => i.gear_id !== gearId);
  res.redirect('/cart');
});

// Checkout page (combined)
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
router.post('/payment/process', (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const cart = req.session.cart || [];
  const user = req.session.user;
  if (!user || cart.length === 0) {
    return res.status(400).send('Missing user or cart data.');
  }

  const account_id = user.account_id;

  // Find payment_mode_id
  const paymentModeQuery = 'SELECT payment_mode_id FROM payment_mode WHERE LOWER(name) = LOWER(?) LIMIT 1';
  connection.query(paymentModeQuery, [paymentMethod], (err, pmResults) => {
    if (err) {
      console.error('DB error in payment_mode lookup:', err);
      return res.status(500).send('Database error.');
    }
    if (pmResults.length === 0) {
      return res.status(400).send('Payment mode not found. Please select a valid payment method.');
    }
    const payment_mode_id = pmResults[0].payment_mode_id;

    // Insert order
    const orderData = {
      order_date: new Date(),
      payment_ref: 'manual',
      account_id,
      payment_mode_id
    };
    connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
      if (err) {
        console.error('DB error in order insert:', err);
        return res.status(500).send('Database error (order).');
      }
      const order_id = orderResult.insertId;

      // Calculate order total for updating payment_mode
      const orderTotal = cart.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);

      // For each cart item, create a transaction_detail and then order_item
      let completed = 0;
      let hasError = false;
      cart.forEach(item => {
        const transactionDetail = {
          transaction_type: 'football gear purchase',
          transaction_date: new Date(),
          amount: item.price_per_unit * item.quantity
        };
        connection.query('INSERT INTO transaction_detail SET ?', transactionDetail, (err, tdResult) => {
          if (err) {
            if (!hasError) {
              hasError = true;
              console.error('DB error in transaction_detail insert:', err);
              return res.status(500).send('Database error (transaction detail).');
            }
            return;
          }
          const transaction_id = tdResult.insertId;
          const orderItem = {
            quantity: item.quantity,
            order_id,
            gear_id: item.gear_id,
            transaction_id
          };
          connection.query('INSERT INTO order_item SET ?', orderItem, (err) => {
            if (err) {
              if (!hasError) {
                hasError = true;
                console.error('DB error in order_item insert:', err);
                return res.status(500).send('Database error (order item).');
              }
              return;
            }
            completed++;
            if (completed === cart.length && !hasError) {
              // Update total_amount in payment_mode
              connection.query(
                'UPDATE payment_mode SET total_amount = IFNULL(total_amount,0) + ? WHERE payment_mode_id = ?',
                [orderTotal, payment_mode_id],
                (err) => {
                  if (err) {
                    console.error('DB error updating total_amount:', err);
                    // Optionally still redirect or show error
                  }
                  req.session.cart = [];
                  res.redirect('/paymentsuccess');
                }
              );
            }
          });
        });
      });
    });
  });
});

// Payment success page (GET)
router.get('/paymentsuccess', (req, res) => {
  res.render('paymentsuccess'); // Make sure you have a paymentsuccess.ejs view
});

// Payment success page (AJAX/PayPal flow)
router.post('/paymentsuccess', (req, res) => {
  const { cart } = req.body;
  const user = req.session.user;
  if (!user || !cart || cart.length === 0) {
    return res.status(400).json({ error: 'Missing user or cart data.' });
  }

  const account_id = user.account_id;
  const payment_mode_id = 1; // Set default or get from your logic (could be improved)
  const orderData = {
    order_date: new Date(),
    payment_ref: 'paypal',
    account_id,
    payment_mode_id
  };

  connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
    if (err) {
      console.error('DB error in order insert (PayPal):', err);
      return res.status(500).json({ error: 'Database error (order).' });
    }

    const order_id = orderResult.insertId;
    let completed = 0;
    let hasError = false;
    cart.forEach(item => {
      const transactionDetail = {
        transaction_type: 'football gear purchase',
        transaction_date: new Date(),
        amount: item.price_per_unit * item.quantity
      };
      connection.query('INSERT INTO transaction_detail SET ?', transactionDetail, (err, tdResult) => {
        if (err) {
          if (!hasError) {
            hasError = true;
            console.error('DB error in transaction_detail insert (PayPal):', err);
            return res.status(500).json({ error: 'Database error (transaction detail).' });
          }
          return;
        }
        const transaction_id = tdResult.insertId;
        const orderItem = {
          quantity: item.quantity,
          order_id,
          gear_id: item.gear_id,
          transaction_id
        };
        connection.query('INSERT INTO order_item SET ?', orderItem, (err) => {
          if (err) {
            if (!hasError) {
              hasError = true;
              console.error('DB error in order_item insert (PayPal):', err);
              return res.status(500).json({ error: 'Database error (order item).' });
            }
            return;
          }
          completed++;
          if (completed === cart.length && !hasError) {
            req.session.cart = [];
            res.json({ success: true });
          }
        });
      });
    });
  });
});

module.exports = router;
=======
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
router.post('/payment/processing', async (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const savePaymentMethod = req.body.savePaymentMethod === 'true';
  const cart = req.session.cart || [];
  const customerId = req.session.customerId;

  if (!customerId) return res.redirect('/login');
  if (cart.length === 0) return res.status(400).send('Cart is empty');

  const orderData = {
    user_id: customerId,
    order_date: new Date(),
    payment_method: paymentMethod
  };

  try {
    const [orderResult] = await connection.query('INSERT INTO `order` SET ?', orderData);
    const orderId = orderResult.insertId;

    const orderItems = cart.map(item => [
      orderId,
      item.gear_id,
      item.quantity,
      item.price_per_unit
    ]);

    await connection.query(
      'INSERT INTO order_item (order_id, gear_id, quantity, price_per_unit) VALUES ?',
      [orderItems]
    );

    req.session.cart = [];
    res.redirect('/payment/success');
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).send('Database error');
  }
});

// Payment success page
router.get('/payment/success', (req, res) => {
  res.render('paymentsuccess');
});

module.exports = router;
>>>>>>> 2e3885d00580b9610447a4e0850ac5c60840c201
