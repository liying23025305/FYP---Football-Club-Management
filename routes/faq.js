const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Middleware for admin authentication (replace with actual logic if available)
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Unauthorized' });
}

// Helper: Validate FAQ input (now with is_published)
function validateFaqInput(question, answer, status, category, is_published) {
  if (!question || typeof question !== 'string' || question.trim().length === 0) return false;
  if (answer && typeof answer !== 'string') return false;
  if (status && !['pending', 'answered', 'archived'].includes(status)) return false;
  if (category && typeof category !== 'string') return false;
  if (is_published && !['yes', 'no'].includes(is_published)) return false;
  return true;
}

// =========================
// PUBLIC ENDPOINTS
// =========================

// GET /api/faqs - Get all published FAQs (status = 'answered' and is_published = 'yes'), optional category filter
router.get('/api/faqs', (req, res) => {
  const { category } = req.query;
  let sql = `SELECT faq_id, question, answer, status, display_order, category, is_published, published_at FROM faq WHERE status = 'answered' AND is_published = 'yes'`;
  const params = [];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY display_order ASC, published_at DESC, created_at DESC';
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// POST /api/faqs - Submit new user question (status = 'pending', is_published = 'no'), with optional category
router.post('/api/faqs', (req, res) => {
  const { question, category } = req.body;
  const userId = req.session.user ? req.session.user.user_id : null;
  if (!validateFaqInput(question, null, null, category, 'no')) {
    return res.status(400).json({ error: 'Invalid question or category' });
  }
  const sql = `INSERT INTO faq (question, category, status, is_published, users_user_id) VALUES (?, ?, 'pending', 'no', ?)`;
  db.query(sql, [question, category, userId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, faq_id: result.insertId });
  });
});

// =========================
// ADMIN ENDPOINTS
// =========================

// GET /api/admin/faqs - Get all FAQs (admin dashboard), optional category filter
router.get('/api/admin/faqs', isAdmin, (req, res) => {
  const { category } = req.query;
  let sql = `SELECT * FROM faq`;
  const params = [];
  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  sql += ' ORDER BY display_order ASC, published_at DESC, created_at DESC';
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// POST /api/admin/faqs - Create new FAQ (admin), with category, is_published, published_at
router.post('/api/admin/faqs', isAdmin, (req, res) => {
  const { question, answer, status, display_order, users_user_id, category, is_published } = req.body;
  if (!validateFaqInput(question, answer, status, category, is_published) || !users_user_id) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  let sql, params;
  if (is_published === 'yes') {
    sql = `INSERT INTO faq (question, answer, status, display_order, users_user_id, category, is_published, published_at) VALUES (?, ?, ?, ?, ?, ?, 'yes', NOW())`;
    params = [question, answer, status, display_order || 0, users_user_id, category];
  } else {
    sql = `INSERT INTO faq (question, answer, status, display_order, users_user_id, category, is_published) VALUES (?, ?, ?, ?, ?, ?, 'no')`;
    params = [question, answer, status, display_order || 0, users_user_id, category];
  }
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, faq_id: result.insertId });
  });
});

// PUT /api/admin/faqs/:id - Update FAQ (admin), with category, is_published, published_at
router.put('/api/admin/faqs/:id', isAdmin, (req, res) => {
  const { question, answer, status, display_order, category, is_published } = req.body;
  const faqId = req.params.id;
  if (!validateFaqInput(question, answer, status, category, is_published)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  let sql, params;
  if (is_published === 'yes') {
    sql = `UPDATE faq SET question=?, answer=?, status=?, display_order=?, category=?, is_published='yes', published_at=IFNULL(published_at, NOW()) WHERE faq_id=?`;
    params = [question, answer, status, display_order || 0, category, faqId];
  } else {
    sql = `UPDATE faq SET question=?, answer=?, status=?, display_order=?, category=?, is_published='no' WHERE faq_id=?`;
    params = [question, answer, status, display_order || 0, category, faqId];
  }
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

// DELETE /api/admin/faqs/:id - Delete/Archive FAQ (admin)
router.delete('/api/admin/faqs/:id', isAdmin, (req, res) => {
  const faqId = req.params.id;
  // Option 1: Hard delete
  // const sql = `DELETE FROM faq WHERE faq_id=?`;
  // Option 2: Soft delete (archive)
  const sql = `UPDATE faq SET status='archived' WHERE faq_id=?`;
  db.query(sql, [faqId], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

module.exports = router; 