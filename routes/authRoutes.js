const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Login Route
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login Submission
router.post('/loginAccount', async (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  const values = [username, password];
  const [user] = await db.query(sql, values);

  if (user && user.length > 0) {
    req.session.user = user[0];
    if (user[0].role === 'admin') return res.redirect('/admin');
    return res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid credentials. Please register.' });
  }
});

// Register Route
router.get('/register', (req, res) => {
  res.render('register');
});

// Register Submission
router.post('/registerAccount', async (req, res) => {
  const {
    username, password, first_name, surname, email, dob, country, marketing_consent
  } = req.body;

  if (!username || !password || !first_name || !surname || !email || !dob || !country) {
    return res.status(400).send('All required fields must be provided.');
  }

  try {
    const marketingConsentValue = marketing_consent === 'yes';
    const sql = `
      INSERT INTO users (username, password, first_name, surname, email, dob, country, marketing_consent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [username, password, first_name, surname, email, dob, country, marketingConsentValue];
    await db.query(sql, values);

    req.session.user = { id: username, email, role: 'member' };
    res.redirect('/');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email_UNIQUE')) return res.status(409).send('Email already exists.');
      if (error.message.includes('username_UNIQUE')) return res.status(409).send('Username already exists.');
      return res.status(409).send('Duplicate entry.');
    }
    res.status(500).send('Registration error.');
  }
});

// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
