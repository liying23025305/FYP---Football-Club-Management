const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// Create your MySQL connection (adjust as needed)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // your password
  database: 'mydb'
});

router.get('/players', (req, res) => {
  connection.query('SELECT * FROM players', (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('players', { players: results });
  });
});

router.get('/players/:id', (req, res) => {
  const playerId = req.params.id;
  connection.query('SELECT * FROM players WHERE player_id = ?', [playerId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('Player not found');
    }
    res.render('player-details', { player: results[0] });
  });
});

module.exports = router;