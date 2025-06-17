const express = require('express');
const router = express.Router();
const connection = require('../models/db'); // Adjust path if needed

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

// Admin Gear Management Dashboard
router.get('/admin/gear', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  const sql = `
    SELECT g.*, COALESCE(SUM(s.quantity), 0) AS total_sold
    FROM gear g
    LEFT JOIN sales s ON g.id = s.gear_id
    GROUP BY g.id
  `;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).send('DB error');
    res.render('admin_gear', { gear: results });
  });
});

// Add new gear
router.post('/admin/gear/add', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  const { gear_name, gear_desc, price_per_unit, quantity } = req.body;
  connection.query(
    'INSERT INTO gear (gear_name, gear_desc, price_per_unit, quantity) VALUES (?, ?, ?, ?)',
    [gear_name, gear_desc, price_per_unit, quantity],
    (err) => {
      if (err) return res.status(500).send('DB error');
      res.redirect('/admin/gear');
    }
  );
});

// Update gear
router.post('/admin/gear/update/:id', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  const { id } = req.params;
  const { gear_name, gear_desc, price_per_unit, quantity } = req.body;
  connection.query(
    'UPDATE gear SET gear_name=?, gear_desc=?, price_per_unit=?, quantity=? WHERE id=?',
    [gear_name, gear_desc, price_per_unit, quantity, id],
    (err) => {
      if (err) return res.status(500).send('DB error');
      res.redirect('/admin/gear');
    }
  );
});

// Delete gear
router.post('/admin/gear/delete/:id', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  const { id } = req.params;
  connection.query('DELETE FROM gear WHERE id=?', [id], (err) => {
    if (err) return res.status(500).send('DB error');
    res.redirect('/admin/gear');
  });
});

module.exports = router;