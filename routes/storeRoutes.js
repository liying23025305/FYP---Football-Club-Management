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
  if (!req.session.cart) req.session.cart = [];
  const item = req.session.cart.find(i => i.gear_id === gearId);
  if (item && newQty > 0) {
    item.quantity = newQty;
  }
  res.redirect('/cart');
});

// Remove item from cart
router.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
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

  // Debug output
  console.log('User selected payment method:', paymentMethod);
  connection.query('SELECT payment_mode_id, name FROM payment_mode', (err2, rows) => {
  console.log('Payment modes in DB:', rows);
});

  // Make query case-insensitive
  const paymentModeQuery = 'SELECT payment_mode_id FROM payment_mode WHERE LOWER(name) = LOWER(?) LIMIT 1';
  connection.query(paymentModeQuery, [paymentMethod], (err, pmResults) => {
    if (err) {
      console.error('DB error in payment_mode lookup:', err);
      return res.status(500).send('Database error.');
    }
    if (pmResults.length === 0) {
      // Print all payment modes for debug
      connection.query('SELECT payment_mode_id, name FROM payment_mode', (err2, rows) => {
        console.log('Payment modes in DB:', rows);
        return res.status(400).send('Payment mode not found. Please select a valid payment method.');
      });
      return;
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
              req.session.cart = [];
              res.redirect('/paymentsuccess');
            }
          });
        });
      });
    });
  });
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