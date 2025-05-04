const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

// Dummy in-memory user storage
let users = [];

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(
  session({
    secret: 'your-secret-key', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
  })
);

// Temporary in-memory cart
let cart = [];

// Home Route
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to my basic Express app!' });
});

// Login Route
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login Submission
app.post('/loginAccount', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid credentials. Please register.' });
  }
});

// Register Route
app.get('/register', (req, res) => {
  res.render('register');
});

// Register Submission
app.post('/registerAccount', (req, res) => {
  const { username, password } = req.body;
  users.push({ username, password }); // store user temporarily
  res.redirect('/login');
});

// Store Route
app.get('/store', (req, res) => {
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  const cart = [
    { gear_id: 1, gear_name: 'Football', price_per_unit: 25.99, quantity: 2 },
    { gear_id: 2, gear_name: 'Jersey', price_per_unit: 49.99, quantity: 1 },
  ];

  res.render('store', { gear, cart });
});

// Add item to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);

  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  const item = gear.find((g) => g.gear_id === gearId);
  if (!item) {
    return res.status(404).send('Item not found');
  }

  const existingItem = cart.find((c) => c.gear_id === gearId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  res.redirect('/store?success=true');
});

// View cart
app.get('/cart', (req, res) => {
  const isMember = false;
  res.render('cart', { cart, isMember });
});

// Remove item from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) {
    res.status(400).send('Invalid gear ID');
    return;
  }

  cart = cart.filter((item) => item.gear_id !== gearId);
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
    item.quantity = newQuantity;
  }
  res.redirect('/cart');
});

// Payment route
app.get('/payment', (req, res) => {
  const customer = { name: 'John Doe', email: 'john.doe@example.com', address: '123 Main St' };
  res.render('payment', { cart, customer });
});

// Process payment
app.post('/payment/process', (req, res) => {
  cart = [];
  res.send('<h1>Payment Successful!</h1><p>Your order has been placed successfully.</p>');
});

// Schedule route
app.get('/schedule', (req, res) => {
  res.render('schedule');
});

// News route
app.get('/news', (req, res) => {
  res.render('news');
});

// Players route
app.get('/players', (req, res) => {
  res.render('players');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
