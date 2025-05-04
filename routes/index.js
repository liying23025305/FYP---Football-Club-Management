const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

// Home page
router.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'Football Club Management',
    user: req.user
  });
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('pages/dashboard', {
    title: 'Dashboard',
    user: req.user
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About Us',
    user: req.user
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('pages/contact', {
    title: 'Contact Us',
    user: req.user
  });
});

// Tickets page
router.get('/tickets', (req, res) => {
  const tab = req.query.tab || 'tickets';
  res.render('pages/tickets', {
    title: 'Tickets',
    user: req.user,
    tab
  });
});

// Players page
router.get('/players', (req, res) => {
  res.render('pages/players', {
    title: 'Players',
    user: req.user
  });
});

// Matches page
router.get('/matches', (req, res) => {
  res.render('pages/matches', {
    title: 'Matches',
    user: req.user
  });
});

// Membership registration page
router.get('/users/membership/registration', (req, res) => {
  res.render('pages/membership_registration', {
    title: 'Membership Registration',
    user: req.user
  });
});

module.exports = router; 