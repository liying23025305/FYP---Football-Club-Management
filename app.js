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

// Temporary in-memory cart
let cart = [];

// Home Route
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to my basic Express app!' });
});

<<<<<<< HEAD
// Login Page
=======
// Route to login
>>>>>>> origin/backup
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

<<<<<<< HEAD
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

// Register Page
=======
// Route to register
>>>>>>> origin/backup
app.get('/register', (req, res) => {
  res.render('register');
});

<<<<<<< HEAD
// Register Submission
app.post('/registerAccount', (req, res) => {
  const { username, password } = req.body;
  users.push({ username, password }); // store user temporarily
  res.redirect('/login');
});

// Other Pages
=======

// Route to store
>>>>>>> origin/backup
app.get('/store', (req, res) => {
  // Placeholder for store items
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  // Placeholder for cart items
  const cart = [
    { gear_id: 1, gear_name: 'Football', price_per_unit: 25.99, quantity: 2 },
    { gear_id: 2, gear_name: 'Jersey', price_per_unit: 49.99, quantity: 1 },
  ];

  // Pass the gear and cart variables to the view
  res.render('store', { gear, cart });
});

<<<<<<< HEAD
=======
// Add item to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);

  // Placeholder for store items
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  // Find the item in the store
  const item = gear.find((g) => g.gear_id === gearId);
  if (!item) {
    return res.status(404).send('Item not found');
  }

  // Check if the item already exists in the cart
  const existingItem = cart.find((c) => c.gear_id === gearId);
  if (existingItem) {
    existingItem.quantity += 1; // Increment quantity
  } else {
    cart.push({ ...item, quantity: 1 }); // Add item to cart with quantity
  }

  // Redirect back to the store page with a success message
  res.redirect('/store?success=true');
});

// View cart
app.get('/cart', (req, res) => {
  // Placeholder for membership status
  const isMember = false; // Assume the user is not a member for now
  res.render('cart', { cart, isMember });
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
  // Placeholder for customer details
  const customer = { name: 'John Doe', email: 'john.doe@example.com', address: '123 Main St' };
  res.render('payment', { cart, customer });
});

// Process payment
app.post('/payment/process', (req, res) => {
  // Placeholder for processing payment
  cart = []; // Clear the cart
  res.send('<h1>Payment Successful!</h1><p>Your order has been placed successfully.</p>');
});

// Route to schedule
>>>>>>> origin/backup
app.get('/schedule', (req, res) => {
  res.render('schedule');
});

<<<<<<< HEAD
=======
// Route to news
>>>>>>> origin/backup
app.get('/news', (req, res) => {
  res.render('news');
});

<<<<<<< HEAD
=======
// Route to players
>>>>>>> origin/backup
app.get('/players', (req, res) => {
  res.render('players');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});