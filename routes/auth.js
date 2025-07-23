const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { initializeDatabase, getConnection } = require('../models/db');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); // Adjust path as needed
const router = express.Router();

// Login Routes
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/profile');
  }
  res.render('login', { 
    error: null, 
    query: req.query 
  });
});

router.post('/loginAccount', async (req, res) => {
  const { login_username, login_password } = req.body;
  
  if (!login_username || !login_password) {
    return res.render('login', { 
      error: 'Username/Email and password are required',
      query: req.query 
    });
  }
  
  try {
    const db = getConnection();
    const [users] = await db.execute(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
      [login_username, login_username]
    );
    
    if (users.length === 0) {
      return res.render('login', { 
        error: 'Invalid username/email or password',
        query: req.query 
      });
    }
    
    const user = users[0];
    const isValidPassword = await bcrypt.compare(login_password, user.password);
    
    if (!isValidPassword) {
      return res.render('login', { 
        error: 'Invalid username/email or password',
        query: req.query 
      });
    }
    
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      surname: user.surname,
      role: user.role
    };
    
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/profile');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { 
      error: 'An error occurred during login. Please try again.',
      query: req.query 
    });
  }
});

// Register Routes
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/profile');
  }
  res.render('register', { 
    errors: null, 
    formData: {} 
  });
});

router.post('/registerAccount', validateRegistration, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('register', {
      errors: errors.array(),
      formData: req.body
    });
  }
  
  const { 
    email, username, password, confirm_password, 
    first_name, surname, dob, country, phone, marketing_consent 
  } = req.body;
  
  try {
    // Check age restriction
    const age = calculateAge(dob);
    if (age < 13) {
      return res.render('register', {
        errors: [{ msg: 'You must be at least 13 years old to register' }],
        formData: req.body
      });
    }
    
    // Check password confirmation
    if (password !== confirm_password) {
      return res.render('register', {
        errors: [{ msg: 'Passwords do not match' }],
        formData: req.body
      });
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(password, username, email);
    if (passwordErrors.length > 0) {
      return res.render('register', {
        errors: passwordErrors.map(msg => ({ msg })),
        formData: req.body
      });
    }
    
    const db = getConnection();
    
    // Check for existing email or username
    const [existingUsers] = await db.execute(
      'SELECT email, username FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      let errorMsg = '';
      if (existing.email === email) {
        errorMsg = 'Email address already exists';
      } else if (existing.username === username) {
        errorMsg = 'Username already exists';
      }
      
      return res.render('register', {
        errors: [{ msg: errorMsg }],
        formData: req.body
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert new user
    await db.execute(`
      INSERT INTO users (email, username, password, first_name, surname, dob, country, phone, marketing_consent, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 1)
    `, [
      email, username, hashedPassword, first_name, surname, 
      dob, country, phone || null, marketing_consent === 'yes' ? 1 : 0
    ]);
    
    res.redirect('/login?registered=true');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      errors: [{ msg: 'An error occurred during registration. Please try again.' }],
      formData: req.body
    });
  }
});

// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;