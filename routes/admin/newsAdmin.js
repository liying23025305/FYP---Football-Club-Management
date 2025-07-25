const express = require('express');
const router = express.Router();
const { getConnection } = require('../../models/db');
const { isAuthenticated } = require('../../models/auth');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'public/images/news/' });

// GET /admin/news - News dashboard & Bookmark Count
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const [newsRows] = await db.execute(
      `SELECT n.*, u.username as author_name, 
        COALESCE(bc.bookmark_count, 0) as bookmark_count
      FROM news n
      JOIN users u ON n.users_user_id = u.user_id
      LEFT JOIN (
        SELECT news_id, COUNT(*) as bookmark_count
        FROM user_bookmarks
        GROUP BY news_id
      ) bc ON n.news_id = bc.news_id
      ORDER BY n.created_at DESC`
    );
    // Stats
    const [statsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(status = 'published') as published,
        SUM(status = 'draft') as draft,
        SUM(status = 'archived') as archived
      FROM news`
    );
    const stats = statsRows[0];
    res.render('admin_news', { news: newsRows, stats, success: req.query.success });
  } catch (err) {
    console.error('Admin news dashboard error:', err);
    res.render('admin_news', { news: [], stats: null, success: null });
  }
});

// GET /admin/news/create - Create news form
router.get('/create', isAuthenticated, (req, res) => {
  res.render('admin/news-create');
});

// POST /admin/news - Create news
router.post('/', isAuthenticated, upload.single('featured_image'), async (req, res) => {
  try {
    const db = getConnection();
    let { title, summary, content, category, status, published_at } = req.body;
    let featured_image = null;
    if (req.file) {
      featured_image = '/images/news/' + req.file.originalname; // Store only the filename
    }
    const user_id = req.session.user.user_id;
    // If publishing now and no published_at, set to CURRENT_TIMESTAMP
    if (status === 'published' && !published_at) {
      published_at = null; // Will use CURRENT_TIMESTAMP in SQL
    }
    // If draft and not scheduled, set published_at to NULL
    if (status === 'draft' && (!published_at || new Date(published_at) <= new Date())) {
      published_at = null;
    }
    await db.execute(
      'INSERT INTO news (title, summary, content, featured_image, category, status, published_at, users_user_id, author_id) VALUES (?, ?, ?, ?, ?, ?, ' + (status === 'published' && !published_at ? 'CURRENT_TIMESTAMP' : '?') + ', ?, ?)',
      status === 'published' && !published_at
        ? [title, summary, content, featured_image, category, status, user_id, user_id]
        : [title, summary, content, featured_image, category, status, published_at || null, user_id, user_id]
    );
    res.redirect('/admin/news?success=created');
  } catch (err) {
    console.error('Error creating news:', err);
    res.render('admin/news-create', { error: 'Failed to create news. Please check your input and try again.' });
  }
});

// GET /admin/news/:id/edit - Edit news form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const newsId = parseInt(req.params.id);
    const [rows] = await db.execute('SELECT * FROM news WHERE news_id = ?', [newsId]);
    if (rows.length === 0) return res.redirect('/admin/news');
    const article = rows[0];
    res.render('admin/news-edit', { article });
  } catch (err) {
    console.error('Error loading edit form:', err);
    res.redirect('/admin/news');
  }
});

// PUT /admin/news/:id - Update news
router.put('/:id', isAuthenticated, upload.single('featured_image'), async (req, res) => {
  try {
    const db = getConnection();
    const newsId = parseInt(req.params.id);
    let { title, summary, content, category, status, published_at } = req.body;
    let featured_image = null;
    if (req.file) {
      featured_image = '/images/news/' + req.file.originalname; // Store only the filename
    }
    // If publishing now and no published_at, set to CURRENT_TIMESTAMP
    if (status === 'published' && !published_at) {
      published_at = null; // Will use CURRENT_TIMESTAMP in SQL
    }
    // If draft and not scheduled, set published_at to NULL
    if (status === 'draft' && (!published_at || new Date(published_at) <= new Date())) {
      published_at = null;
    }
    let updateSql = 'UPDATE news SET title=?, summary=?, content=?, category=?, status=?, published_at=' + (status === 'published' && !published_at ? 'CURRENT_TIMESTAMP' : '?');
    let params = [title, summary, content, category, status];
    if (!(status === 'published' && !published_at)) {
      params.push(published_at || null);
    }
    if (featured_image) {
      updateSql += ', featured_image=?';
      params.push(featured_image);
    }
    updateSql += ' WHERE news_id=?';
    params.push(newsId);
    await db.execute(updateSql, params);
    res.redirect('/admin/news?success=updated');
  } catch (err) {
    console.error('Error updating news:', err);
    res.redirect('/admin/news');
  }
});

// DELETE /admin/news/:id - Delete news
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const newsId = parseInt(req.params.id);
    await db.execute('DELETE FROM news WHERE news_id = ?', [newsId]);
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error deleting news:', err);
    res.redirect('/admin/news');
  }
});

// POST /admin/news/:id/publish - Publish news
router.post('/:id/publish', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const newsId = parseInt(req.params.id);
    // Set status to published and published_at to CURRENT_TIMESTAMP
    await db.execute('UPDATE news SET status = "published", published_at = CURRENT_TIMESTAMP WHERE news_id = ?', [newsId]);
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error publishing news:', err);
    res.redirect('/admin/news');
  }
});

// POST /admin/news/:id/unpublish - Unpublish news (set to draft)
router.post('/:id/unpublish', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const newsId = parseInt(req.params.id);
    // Set status to draft and published_at to NULL
    await db.execute('UPDATE news SET status = "draft", published_at = NULL WHERE news_id = ?', [newsId]);
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error unpublishing news:', err);
    res.redirect('/admin/news');
  }
});

// GET /admin/news/categories - Category management (placeholder)
router.get('/categories', isAuthenticated, (req, res) => {
  res.send('Category management coming soon.');
});

// GET /admin/news/stats - Bookmark stats (placeholder)
router.get('/stats', isAuthenticated, (req, res) => {
  res.send('Bookmark stats coming soon.');
});

// GET /admin/news/api/list - AJAX endpoint for filtered news
router.get('/api/list', isAuthenticated, async (req, res) => {
  const status = req.query.status || '';
  const category = req.query.category || '';
  const search = req.query.search || '';
  let where = 'WHERE 1=1';
  let params = [];
  if (status) {
    where += ' AND n.status = ?';
    params.push(status);
  }
  if (category) {
    where += ' AND n.category = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND n.title LIKE ?';
    params.push(`%${search}%`);
  }
  try {
    const db = getConnection();
    const [newsRows] = await db.execute(
      `SELECT n.*, u.username as author_name,
              COALESCE(bc.bookmark_count, 0) as bookmark_count
       FROM news n
       JOIN users u ON n.users_user_id = u.user_id
       LEFT JOIN (
         SELECT news_id, COUNT(*) as bookmark_count
         FROM user_bookmarks
         GROUP BY news_id
       ) bc ON n.news_id = bc.news_id
       ${where}
       ORDER BY n.created_at DESC`,
      params
    );
    res.json({ success: true, news: newsRows });
  } catch (err) {
    console.error('Error fetching admin news (AJAX):', err);
    res.json({ success: false, news: [] });
  }
});

// GET /admin/news/scheduled - Get scheduled articles (status='draft' and published_at in future)
router.get('/scheduled', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const [rows] = await db.execute(
      `SELECT n.*, u.username as author_name FROM news n JOIN users u ON n.users_user_id = u.user_id
        WHERE n.status = 'draft' AND n.published_at IS NOT NULL AND n.published_at > CURRENT_TIMESTAMP
        ORDER BY n.published_at ASC`
    );
    res.json({ success: true, scheduled: rows });
  } catch (err) {
    console.error('Error fetching scheduled news:', err);
    res.json({ success: false, scheduled: [], error: err.message });
  }
});

// POST /admin/news/:id/schedule - Schedule an article for future publication
router.post('/:id/schedule', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const newsId = parseInt(req.params.id);
    const { published_at } = req.body;
    if (!published_at) return res.status(400).json({ success: false, error: 'Missing publish date/time' });
    await db.execute('UPDATE news SET published_at = ?, status = "draft" WHERE news_id = ?', [published_at, newsId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error scheduling news:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /admin/news/auto-publish - Manually trigger auto-publish (for testing)
router.post('/auto-publish', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    // Find articles ready to publish
    const [rows] = await db.execute(`
      SELECT news_id FROM news
      WHERE status = 'draft'
        AND published_at IS NOT NULL
        AND published_at <= CURRENT_TIMESTAMP
    `);
    if (rows.length > 0) {
      await db.execute(`
        UPDATE news
        SET status = 'published', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'draft'
          AND published_at IS NOT NULL
          AND published_at <= CURRENT_TIMESTAMP
      `);
    }
    res.json({ success: true, published: rows.length });
  } catch (err) {
    console.error('Error in auto-publish:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /admin/news/scheduled-count - Get count of scheduled articles
router.get('/scheduled-count', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const [rows] = await db.execute(
      `SELECT COUNT(*) as scheduled_count FROM news WHERE status = 'draft' AND published_at IS NOT NULL AND published_at > CURRENT_TIMESTAMP`
    );
    res.json({ success: true, scheduled_count: rows[0].scheduled_count });
  } catch (err) {
    console.error('Error fetching scheduled count:', err);
    res.json({ success: false, scheduled_count: 0, error: err.message });
  }
});

module.exports = router;