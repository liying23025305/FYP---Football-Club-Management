const express = require('express');
const router = express.Router();
const { isAdmin } = require('../models/auth');

// Admin Dashboard
router.get('/admin/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  res.render('admin_dashboard', { user: req.session.user });
});

// Admin Info Page *
router.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }

  const data = req.session.user;
  const adminData = {
    username: data.username,
    email: data.email,
    phone: data.phone,
    joinDate: data.dob
  };

  res.render('admin', { admin: adminData });
});

// Admin FAQ Dashboard
router.get('/admin/faq', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  res.render('admin_faqs', { user: req.session.user, success: req.query.success });
});

// Admin Matches Dashboard
router.get('/admin/matches', isAdmin, (req, res) => {
  res.render('admin_matches');
});

// Admin Create Match Page
router.get('/admin/matches-create', isAdmin, (req, res) => {
  res.render('admin/matches-create');
});

// Admin Edit Match Page
router.get('/admin/matches-edit', isAdmin, (req, res) => {
  res.render('admin/matches-edit');
});

module.exports = router;
