const express = require('express');
const router = express.Router();

// Admin Dashboard
router.get('/admin/dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  res.render('admin_dashboard', { user: req.session.user });
});

// Admin Info Page
router.get('/admin', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }

  const data = req.session.user;
  const adminData = {
    username: data.username,
    email: data.email,
    phone: '91234567',
    joinDate: data.dob
  };

  res.render('admin', { admin: adminData });
});

module.exports = router;