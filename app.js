const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const mysql = require('mysql2');

// MySQL connection configuration
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mydb'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

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

// Middleware to initialize session cart
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});

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
  connection.query('SELECT * FROM gear', (err, results) => {
    if (err) {
      console.error('Error fetching gear:', err);
      return res.status(500).send('Database error');
    }
    const cart = req.session.cart || [];
    res.render('store', { gear: results, cart });
  });
});

// Add item to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  connection.query('SELECT * FROM gear WHERE gear_id = ?', [gearId], (err, results) => {
    if (err) {
      console.error('Error fetching gear:', err);
      return res.status(500).send('Database error');
    }
    if (results.length === 0) {
      return res.status(404).send('Item not found');
    }
    const item = results[0];
    if (!req.session.cart) req.session.cart = [];
    const existingItem = req.session.cart.find((c) => c.gear_id === gearId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      req.session.cart.push({ ...item, quantity: 1 });
    }
    res.redirect('/store');
  });
});

// View cart
app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { cart });
});

// Remove item from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter((item) => item.gear_id !== gearId);
  res.redirect('/cart');
});

// Update cart item quantity
app.post('/cart/update/:id', (req, res) => {
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


// Payment route
// Payment method page
app.get('/paymentmethod', (req, res) => {
  const cart = req.session.cart || [];
  const customerId = req.session.customerId;
  if (!customerId) return res.redirect('/login');

  connection.query('SELECT * FROM customer WHERE id = ?', [customerId], (err, results) => {
    if (err) {
      console.error('Error fetching customer:', err);
      return res.status(500).send('Database error');
    }
    const customer = results[0] || null;
    res.render('paymentmethod', { cart, customer });
  });
});

// Payment options page
app.get('/payment/options', (req, res) => {
  const customerId = req.session.customerId;
  if (!customerId) return res.redirect('/login');

  connection.query('SELECT * FROM customer WHERE id = ?', [customerId], (err, results) => {
    if (err) {
      console.error('Error fetching customer:', err);
      return res.status(500).send('Database error');
    }
    const customer = results[0] || null;
    res.render('paymentoptions', { customer });
  });
});

// Payment processing
app.post('/payment/processing', (req, res) => {
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
app.get('/payment/success', (req, res) => {
  res.render('paymentsuccess');
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