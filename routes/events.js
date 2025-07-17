const express = require('express');
const { getConnection } = require('../models/db'); // Adjust path as needed
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const router = express.Router();

// Event Routes
router.get('/events', async (req, res) => {
  try {
    const db = getConnection();
    const [events] = await db.execute(`
      SELECT * FROM events 
      WHERE status IN ('upcoming', 'ongoing') 
      AND event_date >= CURDATE()
      ORDER BY event_date ASC
    `);
    
    res.render('events', {
      user: req.session.user || null,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.render('error', {
      message: 'Error loading events',
      user: req.session.user || null
    });
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    
    // Get event details
    const [events] = await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.render('error', {
        message: 'Event not found',
        user: req.session.user || null
      });
    }
    
    const event = events[0];
    let userTickets = [];
    
    // Get user's tickets for this event if logged in
    if (req.session.user) {
      const [tickets] = await db.execute(`
        SELECT * FROM ticket_purchases 
        WHERE user_id = ? AND event_id = ? AND status IN ('reserved', 'confirmed')
        ORDER BY purchase_date DESC
      `, [req.session.user.user_id, eventId]);
      userTickets = tickets;
    }
    
    res.render('event-detail', {
      user: req.session.user || null,
      event,
      userTickets,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.render('error', {
      message: 'Error loading event details',
      user: req.session.user || null
    });
  }
});

// Reserve tickets
router.post('/events/:id/reserve', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const eventId = req.params.id;
    const quantity = parseInt(req.body.quantity);
    const userId = req.session.user.user_id;
    
    // Get event details
    const [events] = await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.redirect(`/events/${eventId}?error=Event not found`);
    }
    
    const event = events[0];
    
    // Check availability
    if (event.available_tickets < quantity) {
      return res.redirect(`/events/${eventId}?error=Not enough tickets available`);
    }
    
    // Check if user already has reserved tickets for this event
    const [existingReservations] = await db.execute(`
      SELECT * FROM ticket_purchases 
      WHERE user_id = ? AND event_id = ? AND status = 'reserved'
    `, [userId, eventId]);
    
    if (existingReservations.length > 0) {
      return res.redirect(`/events/${eventId}?error=You already have reserved tickets for this event`);
    }
    
    // Calculate prices
    const unitPrice = parseFloat(event.ticket_price);
    const totalPrice = unitPrice * quantity;
    
    // Get user's membership for discount
    let discountPercentage = 0;
    const [memberships] = await db.execute(`
      SELECT um.*, mt.discount_percentage 
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status = 'active'
      ORDER BY um.created_at DESC LIMIT 1
    `, [userId]);
    
    if (memberships.length > 0) {
      discountPercentage = parseFloat(memberships[0].discount_percentage);
    }
    
    const discountAmount = totalPrice * (discountPercentage / 100);
    const finalPrice = totalPrice - discountAmount;
    
    // Set reservation expiry (10 minutes from now)
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    
    // Insert reservation
    await db.execute(`
      INSERT INTO ticket_purchases (
        user_id, event_id, quantity, unit_price, total_price, 
        discount_applied, final_price, status, reservation_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'reserved', ?)
    `, [userId, eventId, quantity, unitPrice, totalPrice, discountAmount, finalPrice, expiryTime]);
    
    // Update available tickets
    await db.execute(`
      UPDATE events SET available_tickets = available_tickets - ? WHERE event_id = ?
    `, [quantity, eventId]);
    
    res.redirect('/cart?success=Tickets reserved successfully');
  } catch (error) {
    console.error('Error reserving tickets:', error);
    res.redirect(`/events/${req.params.id}?error=Error reserving tickets`);
  }
});

module.exports = router;