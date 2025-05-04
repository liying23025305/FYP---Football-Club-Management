const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const passport = require('passport');

// Login page
router.get('/login', (req, res) => {
  res.render('pages/login', {
    title: 'Login'
  });
});

// Register page
router.get('/register', (req, res) => {
  res.render('pages/register', {
    title: 'Register'
  });
});

// Profile page
router.get('/profile', ensureAuthenticated, (req, res) => {
  res.render('pages/profile', {
    title: 'My Profile',
    user: req.user
  });
});

// Membership status
router.get('/membership', (req, res) => {
  res.render('pages/membership', {
    title: 'Membership Status',
    user: req.user
  });
});

// Membership overview pages
router.get('/membership/gold', (req, res) => {
  res.render('pages/membership_overview', {
    tier: 'gold',
    title: 'Gold Membership Overview',
    user: req.user
  });
});
router.get('/membership/silver', (req, res) => {
  res.render('pages/membership_overview', {
    tier: 'silver',
    title: 'Silver Membership Overview',
    user: req.user
  });
});
router.get('/membership/bronze', (req, res) => {
  res.render('pages/membership_overview', {
    tier: 'bronze',
    title: 'Bronze Membership Overview',
    user: req.user
  });
});
// Membership FAQs page
router.get('/membership/faqs', (req, res) => {
  const section = req.query.section || 'rewards';
  res.render('pages/membership_faqs', {
    title: 'Membership FAQs',
    user: req.user,
    section
  });
});

// Register handle
router.post('/register', async (req, res) => {
  // Registration logic will be implemented here
});

// Login handle
router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/users/login',
  failureFlash: true
}));

// Logout handle
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router; 