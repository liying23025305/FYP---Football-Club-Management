const express = require('express');
const router = express.Router();
const { getConnection } = require('../models/db');

// Helper to get schedules for a given month/year
async function getSchedulesForMonth(db, year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${endDate}`;
  const [schedules] = await db.execute(
    'SELECT * FROM schedules WHERE start_time BETWEEN ? AND ? ORDER BY start_time ASC',
    [`${start} 00:00:00`, `${end} 23:59:59`]
  );
  return schedules;
}

// GET /schedule
router.get('/schedule', async (req, res) => {
  const db = getConnection();
  const today = new Date();
  const year = parseInt(req.query.year) || today.getFullYear();
  const month = typeof req.query.month !== 'undefined' ? parseInt(req.query.month) : today.getMonth();
  const selectedDate = req.query.date || null;

  const schedules = await getSchedulesForMonth(db, year, month);

  res.render('schedule', {
    schedules,
    year,
    month,
    selectedDate,
    user: req.session.user || null
  });
});

// POST /schedule/add
router.post('/schedule/add', async (req, res) => {
  const db = getConnection();
  const { date, title, description, location, schedule_type, team, start_time, end_time } = req.body;
  await db.execute(
    'INSERT INTO schedules (start_time, end_time, title, description, location, schedule_type, team) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      `${date} ${start_time}`,
      `${date} ${end_time}`,
      title,
      description,
      location,
      schedule_type,
      team
    ]
  );
  res.redirect(`/schedule?year=${new Date(date).getFullYear()}&month=${new Date(date).getMonth()}`);
});

module.exports = router;