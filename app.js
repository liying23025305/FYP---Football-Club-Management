const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // your password
  database: 'mydb'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Route modules
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const storeRoutes = require('./routes/storeRoutes');
const playersRoutes = require('./routes/players');


// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/', playersRoutes);

// Session middleware
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }
  })
);

// Middleware to initialize session cart
app.use((req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
});

// Routes
app.use(authRoutes);
app.use(adminRoutes);
app.use('/', storeRoutes);

// Home Route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home Page',
    message: 'Welcome to my basic Express app!',
    user: req.session.user
  });
});


// Static routes
app.get('/schedule', (req, res) => {
  connection.query('SELECT * FROM schedules', (err, schedules) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    let editSchedule = null;
    if (req.query.edit) {
      editSchedule = schedules.find(s => s.schedule_id == req.query.edit);
    }
    // Get month/year from query or use current
    const today = new Date();
    const year = req.query.year ? parseInt(req.query.year) : today.getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : today.getMonth();
    const selectedDate = req.query.date || null;
    res.render('schedule', { schedules, editSchedule, year, month, selectedDate });
  });
});
app.get('/news', (req, res) => res.render('news'));
app.get('/players', (req, res) => res.render('players'));
app.get('/profile', (req, res) => res.render('profile'));
app.get('/matches', (req, res) => res.render('matches', { title: 'Matches' }));
app.get('/membership_tiers', (req, res) => res.render('membership_tiers', { title: 'Membership Tiers' }));
app.get('/membership_faqs', (req, res) => res.render('membership_faqs', { title: 'Membership FAQs' }));

// Membership page
app.get('/membership', (req, res) => {
  const user = {
    username: 'john_doe',
    email: 'john@example.com',
    birthday: '1999-04-21',
    membershipTier: 'Gold',
    phone: '98765432',
    favoriteTeam: 'FC Barcha',
    joinDate: '2023-01-10'
  };
  res.render('membership', { user });
});

// Membership tier pages
app.get('/membership/gold', (req, res) => {
  res.render('gold_membership', { title: 'Gold Membership' });
  console.log('Gold membership page requested');
});

app.get('/membership/silver', (req, res) => {
  res.render('silver_membership', { title: 'Silver Membership' });
  console.log('Silver membership page requested');
});

app.get('/membership/bronze', (req, res) => {
  res.render('bronze_membership', { title: 'Bronze Membership' });
  console.log('Bronze membership page requested');
});

app.get('/manage-players', (req, res) => {
  connection.query('SELECT * FROM players', (err, players) => {
    if (err) return res.status(500).send('Database error');
    const editId = req.query.edit;
    if (editId) {
      connection.query('SELECT * FROM players WHERE player_id = ?', [editId], (err, results) => {
        if (err || results.length === 0) return res.render('manage-players', { players, editPlayer: null });
        res.render('manage-players', { players, editPlayer: results[0] });
      });
    } else {
      res.render('manage-players', { players, editPlayer: null });
    }
  });
});

app.post('/players/add', (req, res) => {
  const { player_name, jersey_number, position, biography } = req.body;
  connection.query(
    'INSERT INTO players (player_name, jersey_number, position, biography) VALUES (?, ?, ?, ?)',
    [player_name, jersey_number, position, biography],
    (err) => {
      if (err) return res.status(500).send('Database error');
      res.redirect('/manage-players');
    }
  );
});

app.post('/players/edit/:id', (req, res) => {
  const { player_name, jersey_number, position, biography } = req.body;
  connection.query(
    'UPDATE players SET player_name=?, jersey_number=?, position=?, biography=? WHERE player_id=?',
    [player_name, jersey_number, position, biography, req.params.id],
    (err) => {
      if (err) return res.status(500).send('Database error');
      res.redirect('/manage-players');
    }
  );
});

// Show the schedule page
app.get('/schedule', (req, res) => {
  connection.query('SELECT * FROM schedules', (err, schedules) => {
    if (err) {
      console.error(err); // See the real error in your terminal!
      return res.status(500).send('Database error');
    }
    let editSchedule = null;
    if (req.query.edit) {
      editSchedule = schedules.find(s => s.schedule_id == req.query.edit);
    }
    // Get month/year from query or use current
    const today = new Date();
    const year = req.query.year ? parseInt(req.query.year) : today.getFullYear();
    const month = req.query.month ? parseInt(req.query.month) : today.getMonth();
    const selectedDate = req.query.date || null;
    res.render('schedule', { schedules, editSchedule, year, month, selectedDate });
  });
});

// Add a new schedule
app.post('/schedule/add', (req, res) => {
  const { date, title, description, location, schedule_type, team, start_time, end_time } = req.body;
  const startDateTime = `${date} ${start_time}`;
  const endDateTime = `${date} ${end_time}`;
  connection.query(
    'INSERT INTO schedules (title, description, location, schedule_type, team, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, description, location, schedule_type, team, startDateTime, endDateTime],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }
      res.redirect('/schedule');
    }
  );
});

// Edit an existing schedule
app.post('/schedule/edit/:id', (req, res) => {
  const { date, title, description, location, schedule_type, team, start_time, end_time } = req.body;
  const startDateTime = `${date} ${start_time}`;
  const endDateTime = `${date} ${end_time}`;
  connection.query(
    'UPDATE schedules SET title=?, description=?, location=?, schedule_type=?, team=?, start_time=?, end_time=? WHERE schedule_id=?',
    [title, description, location, schedule_type, team, startDateTime, endDateTime, req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }
      res.redirect('/schedule');
    }
  );
});

// Delete a schedule
app.post('/schedule/delete/:id', (req, res) => {
  connection.query(
    'DELETE FROM schedules WHERE schedule_id=?',
    [req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Database error');
      }
      res.redirect('/schedule');
    }
  );
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
