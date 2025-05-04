const express = require('express');
const path = require('path');
const app = express();

// Dummy in-memory user storage
let users = [];

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Home Route
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to my basic Express app!' });
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login Submission
app.post('/loginAccount', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid credentials. Please register.' });
  }
});

// Register Page
app.get('/register', (req, res) => {
  res.render('register');
});

// Register Submission
app.post('/registerAccount', (req, res) => {
  const { username, password } = req.body;
  users.push({ username, password }); // store user temporarily
  res.redirect('/login');
});

// Other Pages
app.get('/store', (req, res) => {
  res.render('store');
});

app.get('/schedule', (req, res) => {
  res.render('schedule');
});

app.get('/news', (req, res) => {
  res.render('news');
});

app.get('/players', (req, res) => {
  res.render('players');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
