const express = require('express');
const path = require('path');
const app = express();

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files (like styles.css)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Home Page', message: 'Welcome to my basic Express app!' });
});

//Route to login
app.get('/login', (req, res) => {
  res.render('login');
});

//Route to register 
app.get('/register', (req, res) => {
  res.render('register');
});
 
//Route to store
app.get('/store', (req, res) => {
  res.render('store');
});

//Route to schedule
app.get('/schedule', (req, res) => {
  res.render('schedule');
});

//Route to news
app.get('/news', (req, res) => {
  res.render('news');
});

//Route to players
app.get('/players', (req, res) => {
  res.render('players');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
