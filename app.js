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

// Middleware to initialize session cart
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
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
  // Placeholder for store items
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  // Retrieve the cart from the session or initialize it
  const cart = req.session.cart || [];
  res.render('store', { gear, cart });
});

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

  // Initialize the cart in the session if it doesn't exist
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Check if the item already exists in the cart
  const existingItem = req.session.cart.find((c) => c.gear_id === gearId);
  if (existingItem) {
    existingItem.quantity += 1; // Increment quantity
  } else {
    req.session.cart.push({ ...item, quantity: 1 }); // Add item to cart with quantity
  }

  // Redirect back to the store page
  res.redirect('/store');
}); // <-- Properly close the route here

// View cart
app.get('/cart', (req, res) => {
  // Retrieve the cart from the session or initialize it
  const cart = req.session.cart || [];

  // Placeholder for membership status
  const isMember = false; // Assume the user is not a member for now

  res.render('cart', { cart, isMember });
});

// Remove item from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);

  // Ensure the cart exists in the session
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Remove the item from the session cart
  req.session.cart = req.session.cart.filter((item) => item.gear_id !== gearId);

  res.redirect('/cart'); // Redirect back to the cart page
});

// Update cart item quantity
app.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQuantity = parseInt(req.body.quantity, 10);

  // Validate input
  if (isNaN(gearId) || isNaN(newQuantity) || newQuantity <= 0) {
    return res.status(400).send('Invalid input');
  }

  // Ensure the cart exists in the session
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Find the item in the session cart and update its quantity
  const item = req.session.cart.find((item) => item.gear_id === gearId);
  if (item) {
    item.quantity = newQuantity;
  }

  res.redirect('/cart'); // Redirect back to the cart page
}); 

  // Payment route
app.get('/paymentmethod', (req, res) => {
  // Retrieve the cart from the session or initialize it
  const cart = req.session.cart || [];

  // Placeholder for fetching customer details from the database
  const customerId = req.session.customerId || 1; // Assume customer ID is stored in the session
  const customer = {
    id: customerId,
    name: "John Doe", // Placeholder for customer name
    email: "john.doe@example.com", // Placeholder for customer email
    address: "123 Main St", // Placeholder for customer address
  };

  // Render the payment method page with cart and customer details
  res.render('paymentmethod', { cart, customer });
});

// Payment options page
app.get('/payment/options', (req, res) => {
  // Placeholder for fetching customer details from the database
  const customerId = req.session.customerId || 1; // Assume customer ID is stored in the session
  const customer = {
    id: customerId,
    name: "John Doe", // Placeholder for customer name
    email: "john.doe@example.com", // Placeholder for customer email
    address: "123 Main St", // Placeholder for customer address
  };

  // Render the payment options page with customer details
  res.render('paymentoptions', { customer });
});

// Payment processing page
app.post('/payment/processing', (req, res) => {
  const paymentMethod = req.body.paymentMethod; // Get selected payment method
  const savePaymentMethod = req.body.savePaymentMethod === 'true'; // Check if the checkbox is ticked

  console.log(`Processing payment with ${paymentMethod}...`);
  console.log(`Save payment method: ${savePaymentMethod}`);

  // Placeholder for saving the payment method to the database
  if (savePaymentMethod) {
    const customerId = req.session.customerId || 1; // Assume customer ID is stored in the session
    console.log(`Saving payment method "${paymentMethod}" for customer ID ${customerId}...`);
    // Simulate database query
    // db.query('UPDATE membership SET payment_method = ? WHERE id = ?', [paymentMethod, customerId], (err) => {
    //   if (err) {
    //     console.error(err);
    //     return res.status(500).send('Database error');
    //   }
    //   console.log('Payment method saved successfully.');
    // });
  }

  // Simulate payment processing
  setTimeout(() => {
    res.redirect('/payment/success');
  }, 3000); // Simulate a 3-second delay
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
}});
