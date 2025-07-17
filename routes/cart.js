const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { getConnection } = require('../models/db');
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); // Adjust path as needed
const router = express.Router();
const stripe = require('stripe')(require('../config/stripe_config').stripeSecretKey);
const stripeConfig = require('../config/stripe_config');

router.get('/ticket-cart', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Get reserved tickets with event details
    const [reservedTickets] = await db.execute(`
      SELECT tp.*, e.event_name, e.event_date, e.event_time, e.location
      FROM ticket_purchases tp
      JOIN events e ON tp.event_id = e.event_id
      WHERE tp.user_id = ? AND tp.status = 'reserved'
      ORDER BY tp.reservation_expires_at ASC
    `, [userId]);
    
    // Get user's membership for display
    let membership = null;
    const [memberships] = await db.execute(`
      SELECT um.*, mt.tier_name, mt.discount_percentage
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status = 'active'
      ORDER BY um.created_at DESC LIMIT 1
    `, [userId]);
    
    if (memberships.length > 0) {
      membership = memberships[0];
    }
    
    res.render('cart', {
      user: req.session.user,
      reservedTickets,
      membership,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading cart:', error);
    res.render('error', {
      message: 'Error loading cart',
      user: req.session.user
    });
  }
});

// Remove item from cart
router.post('/cart/remove/:purchaseId', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const purchaseId = req.params.purchaseId;
    const userId = req.session.user.user_id;
    
    // Get ticket details before removal
    const [tickets] = await db.execute(`
      SELECT * FROM ticket_purchases 
      WHERE purchase_id = ? AND user_id = ? AND status = 'reserved'
    `, [purchaseId, userId]);
    
    if (tickets.length === 0) {
      return res.redirect('/cart?error=Ticket not found or already processed');
    }
    
    const ticket = tickets[0];
    
    // Remove reservation
    await db.execute('DELETE FROM ticket_purchases WHERE purchase_id = ?', [purchaseId]);
    
    // Return tickets to available pool
    await db.execute(`
      UPDATE events SET available_tickets = available_tickets + ? WHERE event_id = ?
    `, [ticket.quantity, ticket.event_id]);
    
    res.redirect('/cart?success=Ticket removed from cart');
  } catch (error) {
    console.error('Error removing ticket from cart:', error);
    res.redirect('/cart?error=Error removing ticket');
  }
});


// Updated Checkout Route
// Updated Checkout Route with Stripe
router.get('/checkout', isAuthenticated, (req, res) => {
  res.redirect('/unified-payments/unified-checkout');
});

// Process payment - redirect to unified payments
router.post('/checkout/process', isAuthenticated, (req, res) => {
  res.redirect('/unified-payments/unified-checkout');
});

// Main cart route (unified view)
router.get('/cart', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Get reserved tickets with event details
    const [reservedTickets] = await db.execute(`
      SELECT tp.*, e.event_name, e.event_date, e.event_time, e.location
      FROM ticket_purchases tp
      JOIN events e ON tp.event_id = e.event_id
      WHERE tp.user_id = ? AND tp.status = 'reserved'
      ORDER BY tp.reservation_expires_at ASC
    `, [userId]);
    
    // Get user's membership for display
    let membership = null;
    const [memberships] = await db.execute(`
      SELECT um.*, mt.tier_name, mt.discount_percentage
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status = 'active'
      ORDER BY um.created_at DESC LIMIT 1
    `, [userId]);
    
    if (memberships.length > 0) {
      membership = memberships[0];
    }
    
    res.render('cart', {
      user: req.session.user,
      reservedTickets,
      membership,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading cart:', error);
    res.render('error', {
      message: 'Error loading cart',
      user: req.session.user
    });
  }
});

module.exports = router;