const express = require('express');
const router = express.Router();
const { getConnection } = require('../models/db'); // adjust path if needed
const { isAuthenticated, isAdmin } = require('../models/auth');
const upload = require('../middleware/upload'); // adjust path if needed

router.get('/players', async (req, res) => {
  const db = getConnection();
  const [players] = await db.execute('SELECT * FROM players ORDER BY player_name ASC');
  res.render('players', { players, user: req.session.user || null });
});

// Player details route
router.get('/players/:id', async (req, res) => {
  const db = getConnection();
  const [rows] = await db.execute('SELECT * FROM players WHERE player_id = ?', [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).render('error', { message: 'Player not found', user: req.session.user || null });
  }
  const player = rows[0];
  res.render('player-details', { player, user: req.session.user || null });
});

router.post('/players/add', isAuthenticated, isAdmin, upload.single('imageFile'), async (req, res) => {
  const db = getConnection();
  const { player_name, jersey_number, position, biography, player_image } = req.body;
  // Optionally, check if req.file.originalname === player_image
  await db.execute(
    'INSERT INTO players (player_name, jersey_number, position, biography, player_image) VALUES (?, ?, ?, ?, ?)', 
    [player_name, jersey_number, position, biography, player_image]
  );
  res.redirect('/admin/players');
});

router.post('/players/edit/:id', isAuthenticated, isAdmin, upload.single('imageFile'), async (req, res) => {
  const db = getConnection();
  const { player_name, jersey_number, position, biography, player_image } = req.body;
  let imageToSave = player_image;

  // If a new image is uploaded, use its filename
  if (req.file) {
    imageToSave = req.file.originalname;
  }

  await db.execute(
    'UPDATE players SET player_name=?, jersey_number=?, position=?, biography=?, player_image=? WHERE player_id=?',
    [player_name, jersey_number, position, biography, imageToSave, req.params.id]
  );
  res.redirect('/admin/players');
});

module.exports = router;