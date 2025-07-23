const express = require('express');
const router = express.Router();

// Home Route
router.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user || null
  });
});



router.get('/news', (req, res) => {
  res.render('news', {
    user: req.session.user || null
  });
});

module.exports = router;