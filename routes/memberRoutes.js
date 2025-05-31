const express = require('express');
const router = express.Router();
const db = require('../models/db');

//Membership EDIT profile 
router.get('/editProfile', (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  const updated = req.query.updated === '1'; // get flag
  res.render('edit', { user, saved: updated }); // pass to EJS
});

router.post('/editProfile', async (req, res) => {
  const { first_name, surname, email, dob, country, marketing_consent } = req.body;
  const userId = req.session.user.account_id;

  try {
    const sql = `UPDATE users 
                 SET first_name=?, surname=?, email=?, dob=?, country=?, marketing_consent=? 
                 WHERE account_id=?`;

    await db.query(sql, [first_name, surname, email, dob, country, marketing_consent ? 1 : 0, userId]);
    console.log('Update query executed for user:', userId);

    const [rows] = await db.query('SELECT * FROM users WHERE account_id = ?', [userId]);

    if (!rows.length) {
      console.error('No user found with account_id:', userId);
      return res.send('User not found.');
    }

    req.session.user = rows[0];
    console.log('Session updated and profile saved for:', rows[0].username);

    res.redirect('/editProfile?updated=1');

  } catch (err) {
    console.error('Error during profile update:', err);
    res.send('Update failed.');
  }
});



module.exports = router;

