const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { getConnection } = require('../models/db');
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); // Adjust path as needed
const router = express.Router();

// Admin Dashboard
router.get('/admin/dashboard', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    await checkExpiredMemberships();
    
    // Get statistics
    const [userStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users
      FROM users
    `);
    
    const [membershipStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_memberships,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_memberships,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_memberships
      FROM user_memberships
    `);
    
    const [recentUsers] = await db.execute(`
      SELECT user_id, username, email, first_name, surname, created_at, role
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    const [expiringMemberships] = await db.execute(`
      SELECT um.*, u.first_name, u.surname, u.email, mt.tier_name,
             DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
      FROM user_memberships um
      JOIN users u ON um.user_id = u.user_id
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.status = 'active' AND um.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY um.expiry_date ASC
      LIMIT 5
    `);
    
    res.render('admin_dashboard', { 
      user: req.session.user,
      stats: userStats[0],
      membershipStats: membershipStats[0] || { total_memberships: 0, active_memberships: 0, expired_memberships: 0 },
      recentUsers,
      expiringMemberships
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred while loading the dashboard',
      user: req.session.user 
    });
  }
});

// Admin membership tier management
router.get('/admin/membership-tiers', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    const [tiers] = await db.execute(`
      SELECT mt.*, 
             COUNT(um.membership_id) as member_count,
             COUNT(CASE WHEN um.status = 'active' THEN 1 END) as active_members
      FROM membership_tiers mt
      LEFT JOIN user_memberships um ON mt.tier_id = um.tier_id
      GROUP BY mt.tier_id
      ORDER BY mt.display_order, mt.price ASC
    `);
    
    res.render('admin_membership_tiers', {
      user: req.session.user,
      tiers,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Admin membership tiers error:', error);
    res.status(500).render('error', {
      message: 'An error occurred while loading membership tiers',
      user: req.session.user
    });
  }
});

router.get('/admin/membership-tiers/create', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin_membership_tier_form', {
    user: req.session.user,
    tier: null,
    errors: null,
    formData: {}
  });
});

router.post('/admin/membership-tiers/create', isAuthenticated, isAdmin, validateMembershipTier, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('admin_membership_tier_form', {
      user: req.session.user,
      tier: null,
      errors: errors.array(),
      formData: req.body
    });
  }
  
  const { tier_name, tier_desc, discount_percentage, cashback_rate, duration_months, price, display_order } = req.body;
  
  try {
    const db = getConnection();
    
    // Check for duplicate tier name
    const [existing] = await db.execute(
      'SELECT tier_id FROM membership_tiers WHERE tier_name = ?',
      [tier_name]
    );
    
    if (existing.length > 0) {
      return res.render('admin_membership_tier_form', {
        user: req.session.user,
        tier: null,
        errors: [{ msg: 'Tier name already exists' }],
        formData: req.body
      });
    }
    
    await db.execute(`
      INSERT INTO membership_tiers (
        tier_name, tier_desc, discount_percentage, cashback_rate, 
        duration_months, price, display_order, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [tier_name, tier_desc, discount_percentage, cashback_rate, duration_months, price, display_order || 0]);
    
    res.redirect('/admin/membership-tiers?success=created');
  } catch (error) {
    console.error('Create membership tier error:', error);
    res.render('admin_membership_tier_form', {
      user: req.session.user,
      tier: null,
      errors: [{ msg: 'An error occurred while creating the membership tier' }],
      formData: req.body
    });
  }
});

router.get('/admin/membership-tiers/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    const [tiers] = await db.execute(
      'SELECT * FROM membership_tiers WHERE tier_id = ?',
      [req.params.id]
    );
    
    if (tiers.length === 0) {
      return res.status(404).render('error', {
        message: 'Membership tier not found',
        user: req.session.user
      });
    }
    
    res.render('admin_membership_tier_form', {
      user: req.session.user,
      tier: tiers[0],
      errors: null,
      formData: {}
    });
  } catch (error) {
    console.error('Edit membership tier error:', error);
    res.status(500).render('error', {
      message: 'An error occurred while loading the membership tier',
      user: req.session.user
    });
  }
});

router.post('/admin/membership-tiers/:id/edit', isAuthenticated, isAdmin, validateMembershipTier, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const [tiers] = await getConnection().execute('SELECT * FROM membership_tiers WHERE tier_id = ?', [req.params.id]);
    return res.render('admin_membership_tier_form', {
      user: req.session.user,
      tier: tiers[0],
      errors: errors.array(),
      formData: req.body
    });
  }
  
  const { tier_name, tier_desc, discount_percentage, cashback_rate, duration_months, price, display_order, active } = req.body;
  
  try {
    const db = getConnection();
    
    // Check for duplicate tier name (excluding current tier)
    const [existing] = await db.execute(
      'SELECT tier_id FROM membership_tiers WHERE tier_name = ? AND tier_id != ?',
      [tier_name, req.params.id]
    );
    
    if (existing.length > 0) {
      const [tiers] = await db.execute('SELECT * FROM membership_tiers WHERE tier_id = ?', [req.params.id]);
      return res.render('admin_membership_tier_form', {
        user: req.session.user,
        tier: tiers[0],
        errors: [{ msg: 'Tier name already exists' }],
        formData: req.body
      });
    }
    
    await db.execute(`
      UPDATE membership_tiers 
      SET tier_name = ?, tier_desc = ?, discount_percentage = ?, cashback_rate = ?, 
          duration_months = ?, price = ?, display_order = ?, active = ?, updated_at = NOW()
      WHERE tier_id = ?
    `, [tier_name, tier_desc, discount_percentage, cashback_rate, duration_months, price, display_order || 0, active ? 1 : 0, req.params.id]);
    
    res.redirect('/admin/membership-tiers?success=updated');
  } catch (error) {
    console.error('Update membership tier error:', error);
    const [tiers] = await getConnection().execute('SELECT * FROM membership_tiers WHERE tier_id = ?', [req.params.id]);
    res.render('admin_membership_tier_form', {
      user: req.session.user,
      tier: tiers[0],
      errors: [{ msg: 'An error occurred while updating the membership tier' }],
      formData: req.body
    });
  }
});

router.post('/admin/membership-tiers/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    // Soft delete - set active to 0
    await db.execute(
      'UPDATE membership_tiers SET active = 0, updated_at = NOW() WHERE tier_id = ?',
      [req.params.id]
    );
    
    res.redirect('/admin/membership-tiers?success=deleted');
  } catch (error) {
    console.error('Delete membership tier error:', error);
    res.redirect('/admin/membership-tiers?error=delete_failed');
  }
});

// Admin membership management
router.get('/admin/memberships', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    // Check for expired memberships
    await checkExpiredMemberships();
    
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';
    
    let whereClause = '';
    let queryParams = [];
    
    if (status !== 'all') {
      whereClause = 'WHERE um.status = ?';
      queryParams.push(status);
    }
    
    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total 
      FROM user_memberships um ${whereClause}
    `, queryParams);
    const totalMemberships = countResult[0].total;
    const totalPages = Math.ceil(totalMemberships / limit);
    
    // Get memberships with pagination
    const [memberships] = await db.execute(`
      SELECT um.*, u.first_name, u.surname, u.username, u.email, 
             mt.tier_name, mt.price,
             DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
      FROM user_memberships um
      JOIN users u ON um.user_id = u.user_id
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      ${whereClause}
      ORDER BY um.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    res.render('admin_memberships', {
      user: req.session.user,
      memberships,
      currentPage: page,
      totalPages,
      currentStatus: status,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Admin memberships error:', error);
    res.status(500).render('error', {
      message: 'An error occurred while loading memberships',
      user: req.session.user
    });
  }
});

router.post('/admin/memberships/:id/update-status', isAuthenticated, isAdmin, async (req, res) => {
  const { status } = req.body;
  
  try {
    const db = getConnection();
    
    await db.execute(
      'UPDATE user_memberships SET status = ?, updated_at = NOW() WHERE membership_id = ?',
      [status, req.params.id]
    );
    
    res.redirect('/admin/memberships?success=status_updated');
  } catch (error) {
    console.error('Update membership status error:', error);
    res.redirect('/admin/memberships?error=status_update_failed');
  }
});

router.get('/admin/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM users');
    const totalUsers = countResult[0].total;
    const totalPages = Math.ceil(totalUsers / limit);
    
    // Get users with pagination
    const [users] = await db.execute(`
      SELECT user_id, email, username, first_name, surname, dob, country, phone, role, is_active, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    res.render('admin_users', { 
      users, 
      currentPage: page,
      totalPages,
      success: req.query.success,
      error: req.query.error,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred while loading users',
      user: req.session.user 
    });
  }
});

router.get('/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const [users] = await db.execute(
      'SELECT * FROM users WHERE user_id = ?',
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }
    
    res.render('admin_user_edit', { 
      targetUser: users[0], 
      errors: null,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin user edit error:', error);
    res.status(500).render('error', { 
      message: 'An error occurred while loading user details',
      user: req.session.user 
    });
  }
});

router.post('/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { first_name, surname, email, username, phone, country, role, is_active } = req.body;
  
  try {
    const db = getConnection();
    
    // Check for duplicate email/username
    const [existingUsers] = await db.execute(
      'SELECT user_id FROM users WHERE (email = ? OR username = ?) AND user_id != ?',
      [email, username, req.params.id]
    );
    
    if (existingUsers.length > 0) {
      const [users] = await db.execute('SELECT * FROM users WHERE user_id = ?', [req.params.id]);
      return res.render('admin_user_edit', {
        targetUser: users[0],
        errors: [{ msg: 'Email or username already exists for another user' }],
        user: req.session.user
      });
    }
    
    await db.execute(`
      UPDATE users 
      SET first_name = ?, surname = ?, email = ?, username = ?, phone = ?, country = ?, role = ?, is_active = ?, updated_at = NOW()
      WHERE user_id = ?
    `, [first_name, surname, email, username, phone || null, country, role, is_active, req.params.id]);
    
    res.redirect('/admin/users?success=updated');
  } catch (error) {
    console.error('Admin user update error:', error);
    const [users] = await db.execute('SELECT * FROM users WHERE user_id = ?', [req.params.id]);
    res.render('admin_user_edit', {
      targetUser: users[0],
      errors: [{ msg: 'An error occurred while updating the user' }],
      user: req.session.user
    });
  }
});

router.post('/admin/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    // Don't allow deleting yourself
    if (req.params.id == req.session.user.user_id) {
      return res.redirect('/admin/users?error=cannot_delete_self');
    }
    
    await db.execute('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.redirect('/admin/users?success=deleted');
  } catch (error) {
    console.error('Admin user delete error:', error);
    res.redirect('/admin/users?error=delete_failed');
  }
});

router.get('/admin/register', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin_register', { 
    errors: null, 
    formData: {},
    user: req.session.user
  });
});

router.post('/admin/register', isAuthenticated, isAdmin, validateRegistration, async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('admin_register', {
      errors: errors.array(),
      formData: req.body,
      user: req.session.user
    });
  }
  
  const { 
    email, username, password, confirm_password, 
    first_name, surname, dob, country, phone, role 
  } = req.body;
  
  try {
    // Check age restriction
    const age = calculateAge(dob);
    if (age < 13) {
      return res.render('admin_register', {
        errors: [{ msg: 'User must be at least 13 years old' }],
        formData: req.body,
        user: req.session.user
      });
    }
    
    // Check password confirmation
    if (password !== confirm_password) {
      return res.render('admin_register', {
        errors: [{ msg: 'Passwords do not match' }],
        formData: req.body,
        user: req.session.user
      });
    }
    
    // Validate password strength
    const passwordErrors = validatePassword(password, username, email);
    if (passwordErrors.length > 0) {
      return res.render('admin_register', {
        errors: passwordErrors.map(msg => ({ msg })),
        formData: req.body,
        user: req.session.user
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
      
      return res.render('admin_register', {
        errors: [{ msg: errorMsg }],
        formData: req.body,
        user: req.session.user
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Insert new user
    await db.execute(`
      INSERT INTO users (email, username, password, first_name, surname, dob, country, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [email, username, hashedPassword, first_name, surname, dob, country, phone || null, role || 'user']);
    
    res.redirect('/admin/users?success=created');
  } catch (error) {
    console.error('Admin registration error:', error);
    res.render('admin_register', {
      errors: [{ msg: 'An error occurred during registration. Please try again.' }],
      formData: req.body,
      user: req.session.user
    });
  }
});


router.get('/admin/events/:id/edit', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    
    const [events] = await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    res.json({ success: true, event: events[0] });
  } catch (error) {
    console.error('Error fetching event for edit:', error);
    res.status(500).json({ success: false, message: 'Error fetching event details' });
  }
});

// Update event
router.put('/admin/events/:id/update', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    const {
      event_name, event_type, event_date, event_time,
      location, event_desc, capacity, ticket_price, status
    } = req.body;
    
    // Validation
    if (!event_name || !event_date || !capacity || !ticket_price) {
      return res.json({ success: false, message: 'Please fill in all required fields' });
    }
    
    // Get current event details to calculate capacity changes
    const [currentEvent] = await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    
    if (currentEvent.length === 0) {
      return res.json({ success: false, message: 'Event not found' });
    }
    
    const oldCapacity = currentEvent[0].capacity;
    const newCapacity = parseInt(capacity);
    const capacityDifference = newCapacity - oldCapacity;
    
    // Update available tickets based on capacity change
    let newAvailableTickets = currentEvent[0].available_tickets + capacityDifference;
    
    // Ensure available tickets doesn't go negative
    if (newAvailableTickets < 0) {
      newAvailableTickets = 0;
    }
    
    // Update event
    await db.execute(`
      UPDATE events SET 
        event_name = ?, event_type = ?, event_date = ?, event_time = ?,
        location = ?, event_desc = ?, capacity = ?, available_tickets = ?,
        ticket_price = ?, status = ?, updated_at = NOW()
      WHERE event_id = ?
    `, [
      event_name, event_type || null, event_date, event_time || null,
      location || null, event_desc || null, newCapacity, newAvailableTickets,
      parseFloat(ticket_price), status || 'upcoming', eventId
    ]);
    
    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.json({ success: false, message: 'Error updating event' });
  }
});

router.get('/admin/events/:id/tickets', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    
    // Get event details
    const [events] = await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.render('error', {
        message: 'Event not found',
        user: req.session.user
      });
    }
    
    const event = events[0];
    
    // Get all ticket purchases for this event
    const [tickets] = await db.execute(`
      SELECT tp.*, u.username, u.email, u.first_name, u.surname, u.phone,
             p.payment_status, p.transaction_reference, p.completed_at
      FROM ticket_purchases tp
      JOIN users u ON tp.user_id = u.user_id
      LEFT JOIN payments p ON tp.purchase_id = p.purchase_id
      WHERE tp.event_id = ?
      ORDER BY tp.purchase_date DESC
    `, [eventId]);
    
    // Get ticket statistics
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(CASE WHEN status = 'confirmed' THEN quantity ELSE 0 END) as confirmed_tickets,
        SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) as reserved_tickets,
        SUM(CASE WHEN status = 'cancelled' THEN quantity ELSE 0 END) as cancelled_tickets,
        SUM(CASE WHEN status = 'confirmed' THEN final_price ELSE 0 END) as total_revenue
      FROM ticket_purchases 
      WHERE event_id = ?
    `, [eventId]);
    
    res.render('admin/event-tickets', {
      user: req.session.user,
      event,
      tickets,
      stats: stats[0] || {
        total_purchases: 0,
        confirmed_tickets: 0,
        reserved_tickets: 0,
        cancelled_tickets: 0,
        total_revenue: 0
      },
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    // Removed the problematic console.log that was causing issues
    console.error('Error loading event tickets:', error);
    res.render('error', {
      message: 'Error loading event tickets',
      user: req.session.user
    });
  }
});
// Auto-expire reservations (run this periodically or on app startup)
router.get('/admin/cleanup-expired-reservations', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    
    // Get expired reservations
    const [expiredTickets] = await db.execute(`
      SELECT * FROM ticket_purchases 
      WHERE status = 'reserved' AND reservation_expires_at < NOW()
    `);
    
    // Process expired reservations
    for (const ticket of expiredTickets) {
      // Delete expired reservation
      await db.execute('DELETE FROM ticket_purchases WHERE purchase_id = ?', [ticket.purchase_id]);
      
      // Return tickets to available pool
      await db.execute(`
        UPDATE events SET available_tickets = available_tickets + ? WHERE event_id = ?
      `, [ticket.quantity, ticket.event_id]);
    }
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${expiredTickets.length} expired reservations` 
    });
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    res.json({ success: false, message: 'Error cleaning up reservations' });
  }
});

router.get('/api/admin/events/:id/tickets-data', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    
    // Get event details
    const [events] = await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const event = events[0];
    
    // Get all ticket purchases for this event
    const [tickets] = await db.execute(`
      SELECT tp.*, u.username, u.email, u.first_name, u.surname, u.phone,
             p.payment_status, p.transaction_reference, p.completed_at
      FROM ticket_purchases tp
      JOIN users u ON tp.user_id = u.user_id
      LEFT JOIN payments p ON tp.purchase_id = p.purchase_id
      WHERE tp.event_id = ?
      ORDER BY tp.purchase_date DESC
    `, [eventId]);
    
    // Get ticket statistics
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_purchases,
        SUM(CASE WHEN status = 'confirmed' THEN quantity ELSE 0 END) as confirmed_tickets,
        SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) as reserved_tickets,
        SUM(CASE WHEN status = 'cancelled' THEN quantity ELSE 0 END) as cancelled_tickets,
        SUM(CASE WHEN status = 'confirmed' THEN final_price ELSE 0 END) as total_revenue
      FROM ticket_purchases 
      WHERE event_id = ?
    `, [eventId]);
    
    res.json({
      success: true,
      event,
      tickets,
      stats: stats[0] || {
        total_purchases: 0,
        confirmed_tickets: 0,
        reserved_tickets: 0,
        cancelled_tickets: 0,
        total_revenue: 0
      }
    });
    
  } catch (error) {
    console.error('Error loading event tickets data:', error);
    res.json({
      success: false,
      message: 'Error loading event tickets data'
    });
  }
});
// Update your existing cancel endpoint to return JSON for AJAX calls
router.post('/admin/events/:eventId/tickets/:purchaseId/cancel', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const { eventId, purchaseId } = req.params;
    const { reason } = req.body;
    
    // Get ticket details
    const [tickets] = await db.execute(`
      SELECT * FROM ticket_purchases 
      WHERE purchase_id = ? AND event_id = ?
    `, [purchaseId, eventId]);
    
    if (tickets.length === 0) {
      return res.json({ success: false, message: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
    // Check if already cancelled
    if (ticket.status === 'cancelled') {
      return res.json({ success: false, message: 'Ticket is already cancelled' });
    }
    
    // Update ticket status
    await db.execute(`
      UPDATE ticket_purchases 
      SET status = 'cancelled', notes = ?, updated_at = NOW()
      WHERE purchase_id = ?
    `, [reason || 'Cancelled by admin', purchaseId]);
    
    // Return tickets to available pool
    await db.execute(`
      UPDATE events 
      SET available_tickets = available_tickets + ? 
      WHERE event_id = ?
    `, [ticket.quantity, eventId]);
    
    // Update payment status if exists
    await db.execute(`
      UPDATE payments 
      SET payment_status = 'refunded', updated_at = NOW()
      WHERE purchase_id = ?
    `, [purchaseId]);
    
    res.json({ success: true, message: 'Ticket cancelled successfully' });
    
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    res.json({ success: false, message: 'Error cancelling ticket' });
  }
});
// Admin Event Routes
router.get('/admin/events', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const [events] = await db.execute(`
      SELECT * FROM events 
      ORDER BY event_date DESC
    `);
    
    res.render('admin/events', {
      user: req.session.user,
      events,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error fetching admin events:', error);
    res.render('error', {
      message: 'Error loading events',
      user: req.session.user
    });
  }
});

router.post('/admin/events/create', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const {
      event_name, event_type, event_date, event_time,
      location, event_desc, capacity, ticket_price, status
    } = req.body;
    
    // Validation
    if (!event_name || !event_date || !capacity || !ticket_price) {
      return res.redirect('/admin/events?error=Please fill in all required fields');
    }
    
    // Insert event
    await db.execute(`
      INSERT INTO events (
        event_name, event_type, event_date, event_time, location,
        event_desc, capacity, available_tickets, ticket_price, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      event_name, event_type || null, event_date, event_time || null,
      location || null, event_desc || null, parseInt(capacity),
      parseInt(capacity), parseFloat(ticket_price), status || 'upcoming'
    ]);
    
    res.redirect('/admin/events?success=Event created successfully');
  } catch (error) {
    console.error('Error creating event:', error);
    res.redirect('/admin/events?error=Error creating event');
  }
});

router.delete('/admin/events/:id/delete', isAdmin, async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    
    // Check if event has any confirmed tickets
    const [confirmedTickets] = await db.execute(`
      SELECT COUNT(*) as count FROM ticket_purchases 
      WHERE event_id = ? AND status = 'confirmed'
    `, [eventId]);
    
    if (confirmedTickets[0].count > 0) {
      return res.json({
        success: false,
        message: 'Cannot delete event with confirmed ticket purchases'
      });
    }
    
    // Delete the event (this will cascade delete related records)
    await db.execute('DELETE FROM events WHERE event_id = ?', [eventId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.json({ success: false, message: 'Error deleting event' });
  }
});

//manage gear 
router.get('/admin/gear', isAuthenticated, isAdmin, async (req, res) => {
  const db = getConnection();
  const [gear] = await db.execute('SELECT * FROM gear');
  res.render('admin_gear', { user: req.session.user, gear });
});

//manage order history 
router.get('/admin/orders', isAuthenticated, isAdmin, async (req, res) => {
  const db = getConnection();
  const [orders] = await db.execute(`
    SELECT o.*, u.username, u.email 
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
    ORDER BY o.order_date DESC
  `);
  res.render('admin_orders', { user: req.session.user, orders });
});

//manage news 
router.get('/admin/news', isAuthenticated, isAdmin, async (req, res) => {
  const db = getConnection();
  const [news] = await db.execute('SELECT * FROM news ORDER BY created_at DESC');
  res.render('admin_news', { user: req.session.user, news });
});

//manage faq 
router.get('/admin/faqs', isAuthenticated, isAdmin, async (req, res) => {
  const db = getConnection();
  const [faqs] = await db.execute('SELECT * FROM faq ORDER BY display_order ASC');
  res.render('admin_faqs', { user: req.session.user, faqs });
});

//manage players 
router.get('/admin/players', isAuthenticated, isAdmin, async (req, res) => {
  const db = getConnection();
  const [players] = await db.execute('SELECT * FROM players ORDER BY player_name ASC');
  res.render('admin_players', { user: req.session.user, players });
});

//manage schedule 
router.get('/admin/schedule', isAuthenticated, isAdmin, async (req, res) => {
  const db = getConnection();
  const [schedules] = await db.execute('SELECT * FROM schedules ORDER BY start_time ASC');
  res.render('admin_schedule', { user: req.session.user, schedules });
});


module.exports = router;