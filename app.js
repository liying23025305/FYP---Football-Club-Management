const express = require('express');
const path = require('path');
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
  // Placeholder for store items
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  // Placeholder for membership status
  const isMember = false; // Assume the user is not a member for now

  // Pass the cart, gear, and isMember variables to the view
  res.render('store', { gear, cart, isMember });
});

// Add item to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) {
    res.status(400).send('Invalid gear ID');
    return;
  }

  // Placeholder for adding items to the cart
  const placeholderItem = { gear_id: gearId, gear_name: `Item ${gearId}`, price_per_unit: 20.0, quantity: 1 };
  const existingItem = cart.find((item) => item.gear_id === gearId);
  if (existingItem) {
    existingItem.quantity += 1; // Increment quantity
  } else {
    cart.push(placeholderItem); // Add placeholder item to the cart
  }
  res.redirect('/cart');
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