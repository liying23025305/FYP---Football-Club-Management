const express = require('express');
const { getConnection } = require('../models/db'); // Adjust path as needed
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); 
const stripe = require('stripe')(require('../config/stripe_config').stripeSecretKey);
const stripeConfig = require('../config/stripe_config.js');
const router = express.Router();


router.get('/my-tickets', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Get user's tickets with event and payment details
    const [tickets] = await db.execute(`
      SELECT tp.*, e.event_name, e.event_date, e.event_time, e.location,
             p.payment_status, p.transaction_reference, p.completed_at
      FROM ticket_purchases tp
      JOIN events e ON tp.event_id = e.event_id
      LEFT JOIN payments p ON tp.purchase_id = p.purchase_id
      WHERE tp.user_id = ?
      ORDER BY tp.purchase_date DESC
    `, [userId]);
    
    // Calculate statistics
    const stats = {
      total_tickets: tickets.reduce((sum, ticket) => sum + ticket.quantity, 0),
      confirmed_tickets: tickets.filter(t => t.status === 'confirmed').reduce((sum, ticket) => sum + ticket.quantity, 0),
      reserved_tickets: tickets.filter(t => t.status === 'reserved').reduce((sum, ticket) => sum + ticket.quantity, 0),
      total_spent: tickets.filter(t => t.status === 'confirmed').reduce((sum, ticket) => sum + parseFloat(ticket.final_price), 0).toFixed(2)
    };
    
    res.render('my-tickets', {
      user: req.session.user,
      tickets,
      stats,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading user tickets:', error);
    res.render('error', {
      message: 'Error loading your tickets',
      user: req.session.user
    });
  }
});

module.exports = router;