const express = require('express');
const router = express.Router();
const { getConnection } = require('../models/db');
const { isAuthenticated } = require('../models/auth'); // <-- Use this

// ...all routes use isAuthenticated from auth.js...
router.post('/', isAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const { news_id } = req.body;
  if (!news_id) return res.status(400).json({ success: false, error: 'Missing news_id' });
  try {
    const db = getConnection();
    // Prevent duplicate
    const [exists] = await db.query('SELECT 1 FROM user_bookmarks WHERE user_id = ? AND news_id = ?', [userId, news_id]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, error: 'Already bookmarked' });
    }
    await db.query('INSERT INTO user_bookmarks (user_id, news_id) VALUES (?, ?)', [userId, news_id]);
    return res.json({ success: true, message: 'Bookmarked successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/bookmarks/:news_id - Remove bookmark
router.delete('/:news_id', isAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const newsId = req.params.news_id;
  try {
    const db = getConnection();
    await db.query('DELETE FROM user_bookmarks WHERE user_id = ? AND news_id = ?', [userId, newsId]);
    return res.json({ success: true, message: 'Bookmark removed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bookmarks - Get user's bookmarks (with news details)
router.get('/', isAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  try {
    const db = getConnection();
    const [rows] = await db.query(
      `SELECT n.*, ub.bookmarked_at FROM news n JOIN user_bookmarks ub ON n.news_id = ub.news_id WHERE ub.user_id = ? AND n.status = 'published' ORDER BY ub.bookmarked_at DESC`,
      [userId]
    );
    return res.json({ success: true, bookmarks: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bookmarks/check/:news_id - Check if article is bookmarked
router.get('/check/:news_id', isAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  const newsId = req.params.news_id;
  try {
    const db = getConnection();
    const [rows] = await db.query('SELECT 1 FROM user_bookmarks WHERE user_id = ? AND news_id = ?', [userId, newsId]);
    return res.json({ success: true, bookmarked: rows.length > 0 });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router; 