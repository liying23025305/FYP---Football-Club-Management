const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');

// Load environment variables from .env file
const app = express();

// Middleware setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Session middleware


// Database connection using environment variables
const db = mysql.createConnection({
  host: localhost,
  user: root,
  password: '',
  database: fyp1,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to the Football Club Management System!' });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/store', (req, res) => {
  const query = 'SELECT * FROM gear';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching gear:', err);
      res.status(500).send('Error fetching gear');
      return;
    }
    res.render('store', { gear: results });
  });
});

let cart = []; // Temporary in-memory cart

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
      const existingItem = cart.find((item) => item.gear_id == gearId);
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

app.post('/cart/remove/:id', (req, res) => {
  const gearId = req.params.id;
  cart = cart.filter((item) => item.gear_id != gearId); // Remove the item from the cart
  res.redirect('/cart');
});

app.post('/cart/update/:id', (req, res) => {
  const gearId = req.params.id;
  const newQuantity = parseInt(req.body.quantity, 10);
  const item = cart.find((item) => item.gear_id == gearId);
  if (item) {
    item.quantity = newQuantity; // Update the quantity
  }
  res.redirect('/cart');
});

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

app.post('/payment/process', (req, res) => {
  const { paymentMethod, name, email, address } = req.body;
  const accountId = req.session.userId; // Replace with dynamic user ID
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
    const orderItemsData = cart.map((item) => [
      orderId,
      item.gear_id,
      1, // Assuming quantity is 1 for now
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

app.get('/schedule', (req, res) => {
  res.render('schedule');
});

app.get('/news', (req, res) => {
  res.render('news');
});

app.get('/players', (req, res) => {
  res.render('players');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});