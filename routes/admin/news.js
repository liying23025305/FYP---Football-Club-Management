const express = require('express');
const router = express.Router();
const db = require('../../models/db');
const { isAuthenticated } = require('../../models/auth');
const multer = require('multer');
const path = require('path');
const upload = multer({ dest: 'public/images/news/' });

// GET /admin/news - News dashboard
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const [newsRows] = await db.query(
      `SELECT n.*, u.username as author_name FROM news n JOIN users u ON n.users_user_id = u.user_id ORDER BY n.created_at DESC`
    );
    // Stats
    const [statsRows] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(status = 'published') as published,
        SUM(status = 'draft') as draft,
        SUM(status = 'archived') as archived
      FROM news`
    );
    const stats = statsRows[0];
    res.render('admin/news-dashboard', { news: newsRows, stats });
  } catch (err) {
    console.error('Admin news dashboard error:', err);
    res.render('admin/news-dashboard', { news: [], stats: null });
  }
});

// GET /admin/news/create - Create news form
router.get('/create', isAuthenticated, (req, res) => {
  res.render('admin/news-create');
});

// POST /admin/news - Create news
router.post('/', isAuthenticated, upload.single('featured_image'), async (req, res) => {
  try {
    const { title, summary, content, category, status, published_at } = req.body;
    let featured_image = null;
    if (req.file) {
      featured_image = '/images/news/' + req.file.filename;
    }
    const user_id = req.session.user.user_id;
    await db.query(
      'INSERT INTO news (title, summary, content, featured_image, category, status, published_at, users_user_id, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, summary, content, featured_image, category, status, published_at || null, user_id, user_id]
    );
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error creating news:', err);
    res.redirect('/admin/news');
  }
});

// GET /admin/news/:id/edit - Edit news form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const newsId = parseInt(req.params.id);
    const [rows] = await db.query('SELECT * FROM news WHERE news_id = ?', [newsId]);
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
    const newsId = parseInt(req.params.id);
    const { title, summary, content, category, status, published_at } = req.body;
    let featured_image = null;
    if (req.file) {
      featured_image = '/images/news/' + req.file.filename;
    }
    // If new image, update; else keep old
    let updateSql = 'UPDATE news SET title=?, summary=?, content=?, category=?, status=?, published_at=?';
    let params = [title, summary, content, category, status, published_at || null];
    if (featured_image) {
      updateSql += ', featured_image=?';
      params.push(featured_image);
    }
    updateSql += ' WHERE news_id=?';
    params.push(newsId);
    await db.query(updateSql, params);
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error updating news:', err);
    res.redirect('/admin/news');
  }
});

// DELETE /admin/news/:id - Delete news
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const newsId = parseInt(req.params.id);
    await db.query('DELETE FROM news WHERE news_id = ?', [newsId]);
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error deleting news:', err);
    res.redirect('/admin/news');
  }
});

// POST /admin/news/:id/publish - Publish news
router.post('/:id/publish', isAuthenticated, async (req, res) => {
  try {
    const newsId = parseInt(req.params.id);
    await db.query('UPDATE news SET status = "published" WHERE news_id = ?', [newsId]);
    res.redirect('/admin/news');
  } catch (err) {
    console.error('Error publishing news:', err);
    res.redirect('/admin/news');
  }
});

// POST /admin/news/:id/unpublish - Unpublish news (set to draft)
router.post('/:id/unpublish', isAuthenticated, async (req, res) => {
  try {
    const newsId = parseInt(req.params.id);
    await db.query('UPDATE news SET status = "draft" WHERE news_id = ?', [newsId]);
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

module.exports = router; 