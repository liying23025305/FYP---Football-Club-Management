const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// Update your credentials as needed for XAMPP:
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // default for XAMPP
  database: 'mydb'
});

// Show store page
router.get('/store', (req, res) => {
  connection.query('SELECT * FROM gear', (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.render('store', { gear: results, cart: req.session.cart || [] });
  });
});

// Payment processing (form submit)
router.post('/payment/processing', (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const cart = req.session.cart || [];
  const user = req.session.user;
  if (!user || cart.length === 0) {
    return res.status(400).send('Missing user or cart data.');
  }

  const account_id = user.account_id;

  // 1. Find payment_mode_id
  const paymentModeQuery = 'SELECT payment_mode_id FROM payment_mode WHERE name = ? LIMIT 1';
  connection.query(paymentModeQuery, [paymentMethod], (err, pmResults) => {
    if (err || pmResults.length === 0) return res.status(500).send('Payment mode not found.');
    const payment_mode_id = pmResults[0].payment_mode_id;

    // 2. Insert order
    const orderData = {
      order_date: new Date(),
      payment_ref: 'manual',
      account_id,
      payment_mode_id
    };
    connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
      if (err) return res.status(500).send('Database error (order).');
      const order_id = orderResult.insertId;

      // 3. For each cart item, create a transaction_detail and then order_item
      let completed = 0;
      let hasError = false;
      cart.forEach(item => {
        // Insert transaction_detail
        const transactionDetail = {
          transaction_type: 'football gear purchase',
          transaction_date: new Date(),
          amount: item.price_per_unit * item.quantity
        };
        connection.query('INSERT INTO transaction_detail SET ?', transactionDetail, (err, tdResult) => {
          if (err) {
            if (!hasError) {
              hasError = true;
              return res.status(500).send('Database error (transaction detail).');
            }
            return;
          }
          const transaction_id = tdResult.insertId;

          // Insert order_item (order_item_id needs to be generated if not AUTO_INCREMENT)
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
  const payment_mode_id = 1; // Set a default or get from your logic
  const orderData = {
    order_date: new Date(),
    payment_ref: 'paypal',
    account_id,
    payment_mode_id
  };

  connection.query('INSERT INTO `order` SET ?', orderData, (err, orderResult) => {
    if (err) return res.status(500).json({ error: 'Database error (order).' });

    const order_id = orderResult.insertId;
    let completed = 0;
    let hasError = false;
    cart.forEach(item => {
      // Insert transaction_detail
      const transactionDetail = {
        transaction_type: 'football gear purchase',
        transaction_date: new Date(),
        amount: item.price_per_unit * item.quantity
      };
      connection.query('INSERT INTO transaction_detail SET ?', transactionDetail, (err, tdResult) => {
        if (err) {
          if (!hasError) {
            hasError = true;
            return res.status(500).json({ error: 'Database error (transaction detail).' });
          }
          return;
        }
        const transaction_id = tdResult.insertId;

        // Insert order_item
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