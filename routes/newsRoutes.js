const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { isAuthenticated } = require('../models/auth');

// Helper: sanitize input (basic)   --- DELETE JS ???
function sanitize(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// GET /news - List published news (paginated, filter by category)
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 5;
  const category = req.query.category || '';
  const search = req.query.search || '';
  const offset = (page - 1) * perPage;

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
    // Get total count for pagination
    const [countRows] = await db.query(`SELECT COUNT(*) as count FROM news ${where}`, params);
    const total = countRows[0].count;
    const totalPages = Math.ceil(total / perPage);

    // Get news articles
    const [newsRows] = await db.query(
      `SELECT n.*, u.username as author_name FROM news n JOIN users u ON n.users_user_id = u.user_id ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
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

    // Featured news (first article)
    const featured = newsRows.length > 0 ? newsRows[0] : null;
    const articles = featured ? newsRows.slice(1) : [];

    res.render('news', {
      user: req.session.user,
      featured,
      articles,
      categories,
      selectedCategory: category,
      page,
      totalPages,
      bookmarks,
      search
    });
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).render('news', { user: req.session.user, featured: null, articles: [], categories: [], selectedCategory: '', page: 1, totalPages: 1, bookmarks: [], search: '' });
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

// POST /news/bookmark - Add bookmark
router.post('/bookmark', isAuthenticated, async (req, res) => {
  const newsId = parseInt(req.body.news_id);
  const userId = req.session.user.user_id;
  if (isNaN(newsId)) return res.status(400).json({ error: 'Invalid news ID' });
  try {
    await db.query('INSERT IGNORE INTO user_bookmarks (news_id, user_id) VALUES (?, ?)', [newsId, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error bookmarking news:', err);
    res.status(500).json({ error: 'Database error' });
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

module.exports = router;
