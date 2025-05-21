const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const db = require('./models/db');

// Route modules
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }
  })
);

// Expose session user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Temporary in-memory cart
let cart = [];

// Routes
app.use(authRoutes);
app.use(adminRoutes);

// Home Route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home Page',
    message: 'Welcome to my basic Express app!',
    user: req.session.user
  });
});

// Store Route
app.get('/store', (req, res) => {
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
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
  if (!item) return res.status(404).send('Item not found');

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
  const isMember = req.session.user && req.session.user.role === 'member';
  res.render('cart', { cart, isMember });
});

// Remove item from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');

  cart = cart.filter((item) => item.gear_id !== gearId);
  res.redirect('/cart');
});

// Update item quantity
app.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQuantity = parseInt(req.body.quantity, 10);

  if (isNaN(gearId) || isNaN(newQuantity) || newQuantity <= 0) {
    return res.status(400).send('Invalid input');
  }

  const item = cart.find((item) => item.gear_id === gearId);
  if (item) {
    item.quantity = newQuantity;
  }
  res.redirect('/cart');
});

// Payment route
app.get('/paymentmethod', (req, res) => {
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

// Static routes
app.get('/schedule', (req, res) => res.render('schedule'));
app.get('/news', (req, res) => res.render('news'));
app.get('/players', (req, res) => res.render('players'));
app.get('/profile', (req, res) => res.render('profile'));
app.get('/matches', (req, res) => res.render('matches', { title: 'Matches' }));
app.get('/membership_tiers', (req, res) => res.render('membership_tiers', { title: 'Membership Tiers' }));
app.get('/membership_faqs', (req, res) => res.render('membership_faqs', { title: 'Membership FAQs' }));

// Membership page
app.get('/membership', (req, res) => {
  const user = {
    username: 'john_doe',
    email: 'john@example.com',
    birthday: '1999-04-21',
    membershipTier: 'Gold',
    phone: '98765432',
    favoriteTeam: 'FC Barcha',
    joinDate: '2023-01-10'
  };
  res.render('membership', { user });
});

// Membership tier pages
app.get('/membership/gold', (req, res) => {
  res.render('gold_membership', { title: 'Gold Membership' });
  console.log('Gold membership page requested');
});

app.get('/membership/silver', (req, res) => {
  res.render('silver_membership', { title: 'Silver Membership' });
  console.log('Silver membership page requested');
});

app.get('/membership/bronze', (req, res) => {
  res.render('bronze_membership', { title: 'Bronze Membership' });
  console.log('Bronze membership page requested');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
