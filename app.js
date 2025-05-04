const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
require('./config/passport')(passport); // Passport config
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Middleware to serve static files (like styles.css)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Express session
app.use(session({
  secret: 'your_secret_key', // Use a strong secret in production!
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash middleware
app.use(flash());
// Global flash variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// User authentication and profile management
app.use('/users', require('./routes/users'));

// Main pages (home, about, contact, dashboard)
app.use('/', require('./routes/index'));
app.use('/shop', require('./routes/shop'));
app.use('/calendar', require('./routes/calendar'));
app.use('/payments', require('./routes/payments'));
app.use('/admin', require('./routes/admin'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
