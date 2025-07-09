const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Middleware for admin authentication
function isAdmin(req, res, next) {
  console.log('Checking admin authentication...');
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    console.log('Admin authenticated');
    return next();
  }
  console.log('Admin authentication failed');
  return res.status(403).json({ success: false, error: 'Unauthorized' });
}

// Helper: Validate FAQ input
function validateFaqInput(question, answer, status, category, is_published) {
  if (!question || typeof question !== 'string' || question.trim().length === 0) return false;
  if (answer && typeof answer !== 'string') return false;
  if (status && !['pending', 'answered', 'archived'].includes(status)) return false;
  if (category && typeof category !== 'string') return false;
  if (is_published && !['yes', 'no'].includes(is_published)) return false;
  return true;
}

// Test database connection
function testDbConnection() {
  return new Promise((resolve, reject) => {
    db.query('SELECT 1', (err, results) => {
      if (err) {
        console.error('Database connection test failed:', err);
        reject(err);
      } else {
        console.log('Database connection test successful');
        resolve(results);
      }
    });
  });
}

// =========================
// PUBLIC ENDPOINTS
// =========================

// GET /api/faqs - Get all published FAQs
router.get('/api/faqs', async (req, res) => {
  console.log('GET /api/faqs called');
  console.log('Query params:', req.query);
  const { category } = req.query;
  let sql = `SELECT faq_id, question, answer, status, display_order, category, is_published, published_at 
             FROM faq 
             WHERE status = 'answered' AND is_published = 'yes'`;
  const params = [];
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY display_order ASC, published_at DESC, created_at DESC';
  console.log('Executing SQL:', sql);
  console.log('With params:', params);
  try {
    const [results] = await db.query(sql, params);
    console.log('FAQ query results:', results.length, 'records found');
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('FAQ DB error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database error', 
      details: err.message 
    });
  }
});

// POST /api/faqs - Submit new user question
router.post('/api/faqs', async (req, res) => {
  console.log('POST /api/faqs called');
  console.log('Request body:', req.body);
  const { question, category } = req.body || {};
  let userId = req.session.user ? req.session.user.user_id : null;
  console.log('User ID from session:', userId);
  if (!validateFaqInput(question, null, null, category, 'no')) {
    console.log('Validation failed for question submission');
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid question or category' 
    });
  }
  try {
    // If no user session, check or create anonymous user
    if (!userId) {
      const [anonRows] = await db.query(`SELECT user_id FROM users WHERE username = 'anonymous' LIMIT 1`);
      if (anonRows.length > 0) {
        userId = anonRows[0].user_id;
      } else {
        const [anonInsert] = await db.query(`INSERT INTO users (username, email, role) VALUES ('anonymous', 'anonymous@system.local', 'user')`);
        userId = anonInsert.insertId;
      }
    }
    const sql = `INSERT INTO faq (question, category, status, is_published, users_user_id) VALUES (?, ?, 'pending', 'no', ?)`;
    const params = [question, category, userId != null ? userId : null];
    console.log('About to insert FAQ:', { question, category, userId });
    console.log('Executing SQL:', sql);
    console.log('With params:', params);
    const [result] = await db.query(sql, params);
    console.log('Question submitted successfully, ID:', result.insertId);
    res.status(201).json({ 
      success: true, 
      message: 'Your question has been submitted successfully!',
      faq_id: result.insertId 
    });
  } catch (err) {
    console.error('FAQ DB error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database error', 
      details: err.message 
    });
  }
});

// =========================
// ADMIN ENDPOINTS
// =========================

// GET /api/admin/faqs - Get all FAQs (admin dashboard)
router.get('/api/admin/faqs', isAdmin, async (req, res) => {
  console.log('GET /api/admin/faqs called');
  const { category } = req.query;
  let sql = `SELECT * FROM faq`;
  const params = [];
  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  sql += ' ORDER BY display_order ASC, published_at DESC, created_at DESC';
  try {
    const [results] = await db.query(sql, params);
    res.json({ success: true, data: Array.isArray(results) ? results : [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  }
});

// POST /api/admin/faqs - Create new FAQ (admin)
router.post('/api/admin/faqs', isAdmin, (req, res) => {
  console.log('POST /api/admin/faqs called');
  
  const { question, answer, status, display_order, users_user_id, category, is_published } = req.body;
  
  if (!validateFaqInput(question, answer, status, category, is_published) || !users_user_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid input' 
    });
  }
  
  let sql, params;
  if (is_published === 'yes') {
    sql = `INSERT INTO faq (question, answer, status, display_order, users_user_id, category, is_published, published_at) 
           VALUES (?, ?, ?, ?, ?, ?, 'yes', NOW())`;
    params = [question, answer, status, display_order || 0, users_user_id, category];
  } else {
    sql = `INSERT INTO faq (question, answer, status, display_order, users_user_id, category, is_published) 
           VALUES (?, ?, ?, ?, ?, ?, 'no')`;
    params = [question, answer, status, display_order || 0, users_user_id, category];
  }
  
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Admin FAQ creation error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error', 
        details: err.message 
      });
    }
    
    res.json({ success: true, faq_id: result.insertId });
  });
});

// PUT /api/admin/faqs/:id - Update FAQ (admin)
router.put('/api/admin/faqs/:id', isAdmin, (req, res) => {
  console.log('PUT /api/admin/faqs/:id called');
  
  const { question, answer, status, display_order, category, is_published } = req.body;
  const faqId = req.params.id;
  
  if (!validateFaqInput(question, answer, status, category, is_published)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid input' 
    });
  }
  
  let sql, params;
  if (is_published === 'yes') {
    sql = `UPDATE faq 
           SET question=?, answer=?, status=?, display_order=?, category=?, is_published='yes', published_at=IFNULL(published_at, NOW()) 
           WHERE faq_id=?`;
    params = [question, answer, status, display_order || 0, category, faqId];
  } else {
    sql = `UPDATE faq 
           SET question=?, answer=?, status=?, display_order=?, category=?, is_published='no' 
           WHERE faq_id=?`;
    params = [question, answer, status, display_order || 0, category, faqId];
  }
  
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Admin FAQ update error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error', 
        details: err.message 
      });
    }
    
    res.json({ success: true });
  });
});

// DELETE /api/admin/faqs/:id - Hard delete FAQ (admin)
router.delete('/api/admin/faqs/:id', isAdmin, async (req, res) => {
  console.log('DELETE /api/admin/faqs/:id called');
  const faqId = req.params.id;
  try {
    await db.query('DELETE FROM faq WHERE faq_id = ?', [faqId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Database error', details: err.message });
  }
});

// GET /admin/faq/:id/edit - Render edit form for a single FAQ (admin)
router.get('/admin/faq/:id/edit', isAdmin, async (req, res) => {
  const faqId = req.params.id;
  try {
    const [faqRows] = await db.query('SELECT * FROM faq WHERE faq_id = ?', [faqId]);
    if (!faqRows || faqRows.length === 0) {
      return res.status(404).send('FAQ not found');
    }
    res.render('admin/faq-edit', { faq: faqRows[0] });
  } catch (err) {
    res.status(500).send('Database error');
  }
});

// POST /admin/faq/:id/edit - Update FAQ in the database (admin)
router.post('/admin/faq/:id/edit', isAdmin, async (req, res) => {
  const faqId = req.params.id;
  const { question, answer, category, status, is_published, display_order } = req.body;
  if (!question || !status) {
    return res.status(400).send('Question and status are required');
  }
  try {
    let sql, params;
    if (is_published === 'yes') {
      sql = `UPDATE faq SET question=?, answer=?, category=?, status=?, is_published='yes', display_order=?, published_at=IFNULL(published_at, NOW()) WHERE faq_id=?`;
      params = [question, answer, category, status, display_order || 0, faqId];
    } else {
      sql = `UPDATE faq SET question=?, answer=?, category=?, status=?, is_published='no', display_order=? WHERE faq_id=?`;
      params = [question, answer, category, status, display_order || 0, faqId];
    }
    await db.query(sql, params);
    res.redirect('/admin/faq');
  } catch (err) {
    res.status(500).send('Database error');
  }
});

// Health check endpoint
router.get('/api/health', (req, res) => {
  testDbConnection()
    .then(() => {
      res.json({ success: true, message: 'API and database are working' });
    })
    .catch((err) => {
      res.status(500).json({ success: false, error: 'Database connection failed', details: err.message });
    });
});

module.exports = router;