const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const db = require('./models/db'); // your MySQL connection setup

// Route modules
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const memberRoutes = require('./routes/memberRoutes');
const storeRoutes = require('./routes/storeRoutes');

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

// Make user and cart available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  if (!req.session.cart) req.session.cart = [];
  res.locals.cart = req.session.cart;
  next();
});

// Route handlers
app.use(authRoutes);
app.use(adminRoutes);
app.use(memberRoutes);
app.use(storeRoutes);

// Home
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home Page',
    message: 'Welcome to my basic Express app!'
  });
});

// Static Pages
app.get('/schedule', (req, res) => res.render('schedule'));
app.get('/news', (req, res) => res.render('news'));
app.get('/tickets', (req, res) => res.render('tickets'));
app.get('/players', (req, res) => res.render('players'));
app.get('/profile', (req, res) => res.render('profile'));
app.get('/matches', (req, res) => res.render('matches', { title: 'Matches' }));
app.get('/membership_tiers', (req, res) => res.render('membership_tiers', { title: 'Membership Tiers' }));
app.get('/membership_faqs', (req, res) => res.render('membership_faqs', { title: 'Membership FAQs' }));

// Membership main page (load user from session or DB)
app.get('/membership', (req, res) => {
  const user = req.session.user || {}; // eventually pull from DB
  res.render('membership', { user });
});

// Membership tier pages
app.get('/membership/gold', (req, res) => {
  console.log('Gold membership page requested');
  res.render('gold_membership', { title: 'Gold Membership' });
});

app.get('/membership/silver', (req, res) => {
  console.log('Silver membership page requested');
  res.render('silver_membership', { title: 'Silver Membership' });
});

app.get('/membership/bronze', (req, res) => {
  console.log('Bronze membership page requested');
  res.render('bronze_membership', { title: 'Bronze Membership' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
