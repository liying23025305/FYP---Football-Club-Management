const express = require('express');
const bcrypt = require('bcrypt');
const { getConnection } = require('../models/db');
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); 
const stripe = require('stripe')(require('../config/stripe_config').stripeSecretKey);
const stripeConfig = require('../config/stripe_config.js');
const router = express.Router();

// Profile Routes
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    
    // Check for expired memberships
    await checkExpiredMemberships();
    
    const [users] = await db.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [req.session.user.user_id]
    );
    
    if (users.length === 0) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    // Get user's current membership
    const [memberships] = await db.execute(`
      SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
             DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status = 'active'
      ORDER BY um.created_at DESC
      LIMIT 1
    `, [req.session.user.user_id]);
    
    const user = users[0];
    const membership = memberships.length > 0 ? memberships[0] : null;
    
    res.render('profile', { 
      user, 
      membership,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred while loading your profile',
      user: req.session.user 
    });
  }
});

router.post('/profile/update', isAuthenticated, async (req, res) => {
  const { 
    first_name, surname, email, phone, country, 
    current_password, new_password, confirm_password 
  } = req.body;
  
  try {
    const db = getConnection();
    
    // Get current user data
    const [currentUser] = await db.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [req.session.user.user_id]
    );
    
    if (currentUser.length === 0) {
      return res.redirect('/login');
    }
    
    const user = currentUser[0];
    
    // Check if email already exists for other users
    if (email !== user.email) {
      const [existingUsers] = await db.execute(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, req.session.user.user_id]
      );
      
      if (existingUsers.length > 0) {
        return res.render('profile', {
          user: { ...user, ...req.body },
          error: 'Email address already exists for another user'
        });
      }
    }
    
    // If password change is requested
    if (new_password) {
      if (!current_password) {
        return res.render('profile', {
          user: { ...user, ...req.body },
          error: 'Current password is required to change password'
        });
      }
      
      if (new_password !== confirm_password) {
        return res.render('profile', {
          user: { ...user, ...req.body },
          error: 'New passwords do not match'
        });
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        return res.render('profile', {
          user: { ...user, ...req.body },
          error: 'Current password is incorrect'
        });
      }
      
      // Validate new password
      const passwordErrors = validatePassword(new_password, user.username, email);
      if (passwordErrors.length > 0) {
        return res.render('profile', {
          user: { ...user, ...req.body },
          error: passwordErrors.join(', ')
        });
      }
      
      // Update with new password
      const hashedPassword = await bcrypt.hash(new_password, 12);
      await db.execute(`
        UPDATE users 
        SET first_name = ?, surname = ?, email = ?, phone = ?, country = ?, password = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [first_name, surname, email, phone || null, country, hashedPassword, req.session.user.user_id]);
    } else {
      // Update without password change
      await db.execute(`
        UPDATE users 
        SET first_name = ?, surname = ?, email = ?, phone = ?, country = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [first_name, surname, email, phone || null, country, req.session.user.user_id]);
    }
    
    // Update session
    req.session.user.first_name = first_name;
    req.session.user.surname = surname;
    req.session.user.email = email;
    
    res.redirect('/profile?success=true');
  } catch (error) {
    console.error('Profile update error:', error);
    res.render('profile', {
      user: req.body,
      error: 'An error occurred while updating your profile'
    });
  }
});

module.exports = router;