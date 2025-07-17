const express = require('express');
const router = express.Router();

// Home Route
router.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user || null
  });
});

// Static content routes
router.get('/schedule', (req, res) => {
  res.render('schedule', {
    user: req.session.user || null
  });
});

router.get('/news', (req, res) => {
  res.render('news', {
    user: req.session.user || null
  });
});

router.get('/players', (req, res) => {
  res.render('players', {
    user: req.session.user || null
  });
});

module.exports = router;