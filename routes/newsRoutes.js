const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { isAuthenticated } = require('../models/auth');

// Helper: sanitize input to prevent code injection
function sanitize(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// GET /news - List published news (no pagination, scrollable)
router.get('/', async (req, res) => {
  const category = req.query.category || '';
  const search = req.query.search || '';
  let where = "WHERE status = 'published'";
  let params = [];
  if (category && category !== 'All') {
    where += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }
  try {
    // Get all news articles (no pagination)
    const [newsRows] = await db.query(
      `SELECT n.*, u.username as author_name FROM news n JOIN users u ON n.users_user_id = u.user_id ${where} ORDER BY published_at DESC`,
      params
    );
    // Get categories for filter
    const [catRows] = await db.query('SELECT DISTINCT category FROM news WHERE category IS NOT NULL AND category != ""');
    const categories = catRows.map(row => row.category);
    // Get bookmarks for logged-in user
    let bookmarks = [];
    if (req.session.loggedIn && req.session.user) {
      const [bmRows] = await db.query('SELECT news_id FROM user_bookmarks WHERE user_id = ?', [req.session.user.user_id]);
      bookmarks = bmRows.map(bm => bm.news_id);
    }
    // Featured news (latest published)
    const featured = newsRows.length > 0 ? newsRows[0] : null;
    const articles = featured ? newsRows.slice(1) : [];
    res.render('news', {
      user: req.session.user,
      featured,
      articles,
      categories,
      selectedCategory: category,
      bookmarks,
      search
    });
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).render('news', { user: req.session.user, featured: null, articles: [], categories: [], selectedCategory: '', bookmarks: [], search: '' });
  }
});

// GET /news/:id - News detail page
router.get('/:id', async (req, res) => {
  const newsId = parseInt(req.params.id);
  if (isNaN(newsId)) return res.redirect('/news');
  try {
    const [rows] = await db.query('SELECT n.*, u.username as author_name FROM news n JOIN users u ON n.users_user_id = u.user_id WHERE n.news_id = ?', [newsId]);
    if (rows.length === 0) return res.redirect('/news');
    const article = rows[0];
    // Check if bookmarked
    let isBookmarked = false;
    if (req.session.loggedIn && req.session.user) {
      const [bmRows] = await db.query('SELECT 1 FROM user_bookmarks WHERE user_id = ? AND news_id = ?', [req.session.user.user_id, newsId]);
      isBookmarked = bmRows.length > 0;
    }
    res.render('news_detail', { user: req.session.user, article, isBookmarked });
  } catch (err) {
    console.error('Error fetching news detail:', err);
    res.redirect('/news');
  }
});

// POST /news/bookmark - Toggle bookmark
router.post('/bookmark', isAuthenticated, async (req, res) => {
  try {
    const { news_id } = req.body;
    const userId = req.session.user.user_id;
    // Check if already bookmarked
    const [existing] = await db.query(
      'SELECT bookmark_id FROM user_bookmarks WHERE user_id = ? AND news_id = ?',
      [userId, news_id]
    );
    if (existing.length > 0) {
      // Remove bookmark
      await db.query(
        'DELETE FROM user_bookmarks WHERE user_id = ? AND news_id = ?',
        [userId, news_id]
      );
      res.json({ bookmarked: false });
    } else {
      // Add bookmark
      await db.query(
        'INSERT INTO user_bookmarks (user_id, news_id) VALUES (?, ?)',
        [userId, news_id]
      );
      res.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// DELETE /news/bookmark/:id - Remove bookmark
router.delete('/bookmark/:id', isAuthenticated, async (req, res) => {
  const newsId = parseInt(req.params.id);
  const userId = req.session.user.user_id;
  if (isNaN(newsId)) return res.status(400).json({ error: 'Invalid news ID' });
  try {
    await db.query('DELETE FROM user_bookmarks WHERE news_id = ? AND user_id = ?', [newsId, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing bookmark:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /user/bookmarks - List user's bookmarks
router.get('/user/bookmarks', isAuthenticated, async (req, res) => {
  const userId = req.session.user.user_id;
  try {
    const [rows] = await db.query(
      'SELECT n.*, u.username as author_name FROM news n JOIN user_bookmarks b ON n.news_id = b.news_id JOIN users u ON n.users_user_id = u.user_id WHERE b.user_id = ? ORDER BY b.bookmarked_at DESC',
      [userId]
    );
    res.json({ bookmarks: rows });
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /news/bookmarks - Bookmarked News Page
router.get('/bookmarks', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const [bookmarks] = await db.query(`
      SELECT 
        ub.bookmark_id,
        ub.bookmarked_at,
        n.news_id,
        n.title,
        n.summary,
        n.featured_image,
        n.category,
        n.published_at,
        u.username as author_name
      FROM user_bookmarks ub
      JOIN news n ON ub.news_id = n.news_id
      JOIN users u ON n.users_user_id = u.user_id
      WHERE ub.user_id = ?
      ORDER BY ub.bookmarked_at DESC
    `, [userId]);
    res.render('bookmarked_news', { user: req.session.user, bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).render('bookmarked_news', { user: req.session.user, bookmarks: [] });
  }
});

// GET /api/news - AJAX endpoint for filtered news
router.get('/api/news', async (req, res) => {
  const category = req.query.category || '';
  const search = req.query.search || '';
  let where = "WHERE status = 'published'";
  let params = [];
  if (category && category !== 'All') {
    where += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }
  try {
    const [newsRows] = await db.query(
      `SELECT n.*, u.username as author_name FROM news n JOIN users u ON n.users_user_id = u.user_id ${where} ORDER BY published_at DESC`,
      params
    );
    let bookmarks = [];
    let user = null;
    if (req.session.loggedIn && req.session.user) {
      user = req.session.user;
      const [bmRows] = await db.query('SELECT news_id FROM user_bookmarks WHERE user_id = ?', [user.user_id]);
      bookmarks = bmRows.map(bm => bm.news_id);
    }
    res.json({ success: true, articles: newsRows, bookmarks, user });
  } catch (err) {
    console.error('Error fetching news (AJAX):', err, 'Params:', params, 'Where:', where);
    res.json({ success: false, articles: [], bookmarks: [], user: null, error: err.message });
  }
});

module.exports = router;
