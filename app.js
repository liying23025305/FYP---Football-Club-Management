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

// Middleware to initialize session cart
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});

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
  connection.query('SELECT * FROM gear', (err, results) => {
    if (err) {
      console.error('Error fetching gear:', err);
      return res.status(500).send('Database error');
    }
    // Convert price_per_unit to a number for each item
    const gear = results.map(item => ({
      ...item,
      price_per_unit: Number(item.price_per_unit)
    }));
    const cart = req.session.cart || [];
    res.render('store', { gear, cart });
  });
});

// Add item to cart
app.post('/cart/add/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');
  connection.query('SELECT * FROM gear WHERE gear_id = ?', [gearId], (err, results) => {
    if (err || results.length === 0) return res.status(404).send('Item not found');
    const item = results[0];
    item.price_per_unit = Number(item.price_per_unit);

    // Use session cart
    const cart = req.session.cart;

    const existingItem = cart.find((c) => c.gear_id === gearId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }

    res.redirect('/store?success=true');
  });
});

// View cart
app.get('/cart', (req, res) => {
  const isMember = req.session.user && req.session.user.role === 'member';
  const cart = req.session.cart || [];
  res.render('cart', { cart, isMember });
});

// Remove item from cart
app.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');

  // Ensure the cart exists in the session
  if (!req.session.cart) {
    req.session.cart = [];
  }

  // Remove the item from the session cart
  req.session.cart = req.session.cart.filter((item) => item.gear_id !== gearId);
  res.redirect('/cart');
});

// Update item quantity
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
// Payment route (placeholder customer)
app.get('/paymentmethod', (req, res) => {
  const cart = req.session.cart || [];
  // Placeholder customer object
  const customer = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    address: '123 Test Lane'
  };
  res.render('paymentmethod', { cart, customer });
});

// Payment options page (placeholder customer)
app.get('/payment/options', (req, res) => {
  // Placeholder customer object
  const customer = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    address: '123 Test Lane'
  };
  res.render('paymentoptions', { customer });
});

// Payment options page
app.get('/payment/options', (req, res) => {
  const customerId = req.session.customerId || 1; // Replace with real session logic

  // Fetch customer details from the database
  connection.query('SELECT * FROM users WHERE id = ?', [customerId], (err, results) => {
    if (err || results.length === 0) {
      console.error('Error fetching customer:', err);
      return res.status(500).send('Customer not found');
    }
    const customer = results[0];
    res.render('paymentoptions', { customer });
  });
});

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
