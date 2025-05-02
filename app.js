const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files (like styles.css)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: 'your-secret-key', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'fyp1',
  port: 3000, // Add this line if MySQL is running on a non-default port
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Temporary in-memory cart
let cart = [];

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to my basic Express app!' });
});

// Route to login
app.get('/login', (req, res) => {
  res.render('login');
});

// Route to register
app.get('/register', (req, res) => {
  res.render('register');
});

// Route to store
app.get('/store', (req, res) => {
  const query = 'SELECT * FROM gear'; // Fetch all items from the gear table
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching store items:', err);
      res.status(500).send('Error fetching store items');
      return;
    }
    res.render('store', { gear: results }); // Pass the gear data to store.ejs
  });
});

// Add item to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) {
    res.status(400).send('Invalid gear ID');
    return;
  }

  const query = 'SELECT * FROM gear WHERE gear_id = ?';
  db.query(query, [gearId], (err, results) => {
    if (err) {
      console.error('Error adding to cart:', err);
      res.status(500).send('Error adding to cart');
      return;
    }
    if (results.length > 0) {
      const existingItem = cart.find((item) => item.gear_id === gearId);
      if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1; // Increment quantity
      } else {
        results[0].quantity = 1; // Initialize quantity
        cart.push(results[0]); // Add the gear to the cart
      }
    }
    res.redirect('/cart');
  });
});

// View cart
app.get('/cart', (req, res) => {
  const accountId = req.session.userId || 1; // Replace with dynamic user ID from session
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

// Remove item from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) {
    res.status(400).send('Invalid gear ID');
    return;
  }

  cart = cart.filter((item) => item.gear_id !== gearId); // Remove the item from the cart
  res.redirect('/cart');
});

// Update cart item quantity
app.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQuantity = parseInt(req.body.quantity, 10);

  if (isNaN(gearId) || isNaN(newQuantity) || newQuantity <= 0) {
    res.status(400).send('Invalid input');
    return;
  }

  const item = cart.find((item) => item.gear_id === gearId);
  if (item) {
    item.quantity = newQuantity; // Update the quantity
  }
  res.redirect('/cart');
});

// Payment route
app.get('/payment', (req, res) => {
  const accountId = req.session.userId || 1; // Replace with dynamic user ID from session
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
  const accountId = req.session.userId || 1; // Replace with dynamic user ID
  const totalAmount = cart.reduce((sum, item) => sum + parseFloat(item.price_per_unit) * (item.quantity || 1), 0);

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
    const orderItemsData = cart.map((item) => [
      orderId,
      item.gear_id,
      item.quantity || 1,
      item.price_per_unit,
    ]);

    db.query(orderItemsQuery, [orderItemsData], (err) => {
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

// Route to schedule
app.get('/schedule', (req, res) => {
  res.render('schedule');
});

// Route to news
app.get('/news', (req, res) => {
  res.render('news');
});

// Route to players
app.get('/players', (req, res) => {
  res.render('players');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});