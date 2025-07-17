const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const { isAuthenticated } = require('../models/auth');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mydb'
});

// GET reservation form
router.get('/new', isAuthenticated, (req, res) => {
  res.render('reservations/new', { 
    title: 'Book Cafe Reservation',
    user: req.session.user 
  });
});

// GET available time slots for a date
router.get('/slots/:date', isAuthenticated, async (req, res) => {
  try {
    const date = req.params.date;
    
    // Get all available time slots
    const [timeSlots] = await connection.promise().query(
      'SELECT * FROM reservation_time_slots WHERE is_active = 1 ORDER BY time_slot'
    );
    
    // Get existing reservations for this date
    const [existingReservations] = await connection.promise().query(
      'SELECT reservation_time, COUNT(*) as booked_count FROM reservations WHERE reservation_date = ? AND status IN ("pending", "confirmed") GROUP BY reservation_time',
      [date]
    );
    
    // Check availability for each slot
    const availableSlots = timeSlots.map(slot => {
      const existing = existingReservations.find(r => r.reservation_time === slot.time_slot);
      const bookedCount = existing ? existing.booked_count : 0;
      return {
        time: slot.time_slot,
        timeFormatted: slot.time_slot.slice(0, 5), // Format HH:MM
        available: bookedCount < slot.max_capacity,
        booked: bookedCount,
        capacity: slot.max_capacity
      };
    });
    
    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ error: 'Failed to fetch time slots' });
  }
});

// POST create reservation
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { date, time, party_size, comment } = req.body;
    const userId = req.session.user.user_id;
    
    // Validate inputs
    if (!date || !time) {
      return res.status(400).json({ error: 'Date and time are required' });
    }
    
    // Check if slot is still available
    const [existingCount] = await connection.promise().query(
      'SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ? AND reservation_time = ? AND status IN ("pending", "confirmed")',
      [date, time]
    );
    
    const [slotInfo] = await connection.promise().query(
      'SELECT max_capacity FROM reservation_time_slots WHERE time_slot = ?',
      [time]
    );
    
    if (slotInfo.length === 0) {
      return res.status(400).json({ error: 'Invalid time slot' });
    }
    
    if (existingCount[0].count >= slotInfo[0].max_capacity) {
      return res.status(400).json({ error: 'Time slot is fully booked' });
    }
    
    // Create reservation
    const [result] = await connection.promise().query(
      'INSERT INTO reservations (user_id, reservation_date, reservation_time, party_size, notes, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [userId, date, time, party_size || 1, comment || '']
    );
    
    // Send confirmation email (optional)
    try {
      const { sendEmail } = require('../services/emailService');
      const customerName = `${req.session.user.first_name} ${req.session.user.surname}`;
      
      await sendEmail(
        req.session.user.email,
        'reservationConfirmation',
        customerName,
        date,
        time,
        party_size || 1,
        comment || ''
      );
    } catch (emailError) {
      console.error('Error sending reservation confirmation email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Reservation booked successfully!',
      reservation: {
        id: result.insertId,
        date: date,
        time: time,
        party_size: party_size || 1,
        comment: comment || ''
      }
    });
    
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// GET user's reservations
router.get('/my-reservations', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    
    const [reservations] = await connection.promise().query(
      `SELECT r.*, u.first_name, u.surname 
       FROM reservations r 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.user_id = ? 
       ORDER BY r.reservation_date DESC, r.reservation_time DESC`,
      [userId]
    );
    
    res.render('reservations/my-reservations', {
      title: 'My Reservations',
      user: req.session.user,
      reservations: reservations
    });
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    res.status(500).render('error', { 
      message: 'Failed to load reservations',
      user: req.session.user 
    });
  }
});

// POST cancel reservation
router.post('/cancel/:id', isAuthenticated, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const userId = req.session.user.user_id;
    
    // Verify the reservation belongs to the user
    const [reservation] = await connection.promise().query(
      'SELECT * FROM reservations WHERE reservation_id = ? AND user_id = ?',
      [reservationId, userId]
    );
    
    if (reservation.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Update reservation status
    await connection.promise().query(
      'UPDATE reservations SET status = "cancelled" WHERE reservation_id = ?',
      [reservationId]
    );
    
    res.json({ 
      success: true, 
      message: 'Reservation cancelled successfully' 
    });
    
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

module.exports = router;
