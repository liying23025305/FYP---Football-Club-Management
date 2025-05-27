const express = require('express');
const router = express.Router();

// Main news page
router.get('/', (req, res) => {
  res.render('news');
});

// Featured news detail page
router.get('/featured', (req, res) => {
  res.render('news_detail');
});

module.exports = router; 