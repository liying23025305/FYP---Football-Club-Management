const express = require('express');
const router = express.Router();

// Home Route
router.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user || null
  });
});

// Static content routes
router.get('/store', (req, res) => {
  const gear = [
    { gear_id: 1, gear_name: 'Football', gear_desc: 'High-quality football', price_per_unit: 25.99 },
    { gear_id: 2, gear_name: 'Jersey', gear_desc: 'Team jersey', price_per_unit: 49.99 },
    { gear_id: 3, gear_name: 'Boots', gear_desc: 'Football boots', price_per_unit: 89.99 },
  ];

  res.render('store', { 
    gear, 
    cart: [],
    user: req.session.user || null
  });
});

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