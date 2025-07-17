require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { initializeDatabase, getConnection } = require('./models/db');
const { isAuthenticated, isAdmin, canAccessProfile } = require('./models/auth');
const stripe = require('stripe')(require('./config/stripe_config').stripeSecretKey);
const app = express();
const stripeConfig = require('./config/stripe_config.js');
const dotenv = require('dotenv');

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


app.use(
  session({
    secret: 'football-club-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      httpOnly: true, 
      secure: false, 
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

const cleanupExpiredReservations = async (req, res, next) => {
  try {
    const db = getConnection();
    await db.execute(`
      UPDATE ticket_purchases 
      SET status = 'cancelled' 
      WHERE status = 'reserved' AND reservation_expires_at < NOW()
    `);
    
    // Update available tickets for events
    await db.execute(`
      UPDATE events e 
      SET available_tickets = (
        SELECT e.capacity - COALESCE(SUM(tp.quantity), 0)
        FROM ticket_purchases tp 
        WHERE tp.event_id = e.event_id 
        AND tp.status IN ('confirmed', 'reserved')
      )
    `);
    
    next();
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    next();
  }
};

app.use(cleanupExpiredReservations);

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const membershipRoutes = require('./routes/membership');
const eventsRoutes = require('./routes/events');
const ticketsRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const staticRoutes = require('./routes/static');
const cartRoutes = require('./routes/cart');
const storeRoutes = require('./routes/storeRoutes');
const refundRoutes = require('./routes/refund');
const reservationsRoutes = require('./routes/reservations');
const unifiedPaymentsRoutes = require('./routes/unifiedPayments');

// Use routes
app.use('/', authRoutes);
app.use('/', profileRoutes);
app.use('/', membershipRoutes);
app.use('/', eventsRoutes);
app.use('/', ticketsRoutes);
app.use('/', adminRoutes);
app.use('/', staticRoutes);
app.use('/', cartRoutes);
app.use('/', storeRoutes);
app.use('/', refundRoutes);
app.use('/reservations', reservationsRoutes);
app.use('/unified-payments', unifiedPaymentsRoutes);
// Error handling middleware
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    user: req.session.user || null
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('error', { 
    message: 'An internal server error occurred',
    user: req.session.user || null
  });
});

// Start Server
const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});