const express = require('express');
const path = require('path');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const accountId = req.session.userId; // Assuming userId is stored in the session

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files (like styles.css)
app.use(express.static('public'));

// Use built-in body-parser functionality in Express
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to my basic Express app!' });
});

//Route to login
app.get('/login', (req, res) => {
  res.render('login');
});

//Route to register 
app.get('/register', (req, res) => {
  res.render('register');
});

// Store route: Display all gear
app.get('/store', (req, res) => {
  const query = 'SELECT * FROM gear'; // Fetch all gear from the database
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching gear:', err);
      res.status(500).send('Error fetching gear');
      return;
    }
    res.render('store', { gear: results }); // Pass the gear data to the store.ejs file
  });
});

let cart = []; // Temporary in-memory cart

// Add gear to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = req.params.id;
  const query = 'SELECT * FROM gear WHERE gear_id = ?';
  db.query(query, [gearId], (err, results) => {
    if (err) {
      console.error('Error adding to cart:', err);
      res.status(500).send('Error adding to cart');
      return;
    }
    if (results.length > 0) {
      const existingItem = cart.find(item => item.gear_id == gearId);
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1; // Increment quantity
      } else {
        results[0].quantity = 1; // Initialize quantity
        cart.push(results[0]); // Add the gear to the cart
      }
    }}
  };
)''

// View cart
app.get('/cart', (req, res) => {
  const accountId = req.session.userId; // Replace with dynamic user ID from session
  const query = 'SELECT is_member FROM customer_account WHERE account_id = ?';

  db.query(query, [accountId], (err, results) => {
    if (err) {
      console.error('Error fetching membership status:', err);
      res.status(500).send('Error fetching membership status');
      return;
    }

    const isMember = results.length > 0 ? results[0].is_member : false; // Check if the user is a member
    res.render('cart', { cart, isMember });
  });
});

// Remove gear from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = req.params.id;
  cart = cart.filter(item => item.gear_id != gearId); // Remove the item from the cart
  res.redirect('/cart');
});

// Update gear quantity in cart
app.post('/cart/update/:id', (req, res) => {
  const gearId = req.params.id;
  const newQuantity = parseInt(req.body.quantity, 10);
  const item = cart.find(item => item.gear_id == gearId);
  if (item) {
    item.quantity = newQuantity; // Update the quantity
  }
  res.redirect('/cart');
});

// Payment route
app.get('/payment', (req, res) => {
  const accountId = req.session.userId; // Replace with dynamic user ID from session
  if (!accountId) {
    res.redirect('/login'); // Redirect to login if user is not authenticated
    return;
  }

  const query = 'SELECT name, email, address FROM customer_account WHERE account_id = ?';
  db.query(query, [accountId], (err, results) => {
    if (err) {
      console.error('Error fetching customer details:', err);
      res.status(500).send('Error fetching customer details');
      return;
    }

    if (!results.length) {
      res.status(404).send('Customer not found');
      return;
    }

    const customer = results[0];
    res.render('payment', { cart, customer });
  });
});

// Process payment
app.post('/payment/process', (req, res) => {
  const { paymentMethod, name, email, address } = req.body;
  const accountId = 1; // Replace with dynamic user ID
  const totalAmount = cart.reduce((sum, item) => sum + parseFloat(item.price_per_unit), 0);

  const orderQuery = `
    INSERT INTO \`order\` (order_date, account_id, total_amount)
    VALUES (NOW(), ?, ?)
  `;
  db.query(orderQuery, [accountId, totalAmount], (err, orderResult) => {
    if (err) {
      console.error('Error inserting order:', err);
      res.status(500).send('Error processing payment');
      return;
    }

    const orderId = orderResult.insertId;

    const orderItemsQuery = `
      INSERT INTO order_items (order_id, gear_id, quantity, price)
      VALUES ?
    `;
    const orderItemsData = cart.map(item => [
      orderId,
      item.gear_id,
      1, // Assuming quantity is 1 for now
      item.price_per_unit
    ]);

    db.query(orderItemsQuery, [orderItemsData], err => {
      if (err) {
        console.error('Error inserting order items:', err);
        res.status(500).send('Error processing payment');
        return;
      }

      cart = []; // Clear the cart
      res.send('<h1>Payment Successful!</h1><p>Your order has been placed successfully.</p>');
    });
  });
});

//Route to schedule
app.get('/schedule', (req, res) => {
  res.render('schedule');
});

//Route to news
app.get('/news', (req, res) => {
  res.render('news');
});

//Route to players
app.get('/players', (req, res) => {
  res.render('players');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
