const express = require('express');
const { getConnection } = require('../models/db'); // Adjust path as needed
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); 
const stripe = require('stripe')(require('../config/stripe_config').stripeSecretKey);
const stripeConfig = require('../config/stripe_config.js');
const router = express.Router();

// Payment Routes
router.get('/payment', async (req, res) => {
  res.render('payment', {
    amount: 1000,
    title: 'Secure Payment'
  });
});

router.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Payment Intent for Tickets
router.post('/create-ticket-payment-intent', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Get reserved tickets and calculate total
    const [reservedTickets] = await db.execute(`
      SELECT * FROM ticket_purchases 
      WHERE user_id = ? AND status = 'reserved' AND reservation_expires_at > NOW()
    `, [userId]);
    
    if (reservedTickets.length === 0) {
      return res.status(400).json({ error: 'No valid reservations found' });
    }
    
    const totalAmount = reservedTickets.reduce((sum, ticket) => 
      sum + parseFloat(ticket.final_price), 0
    );
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: {
        user_id: userId,
        purchase_type: 'tickets',
        purchase_ids: reservedTickets.map(t => t.purchase_id).join(',')
      }
    });
    
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      totalAmount: totalAmount.toFixed(2)
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/confirm-ticket-payment', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const { payment_intent_id } = req.body;
    const userId = req.session.user.user_id;
    
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.json({ success: false, message: 'Payment not completed' });
    }
    
    // Get reserved tickets
    const [reservedTickets] = await db.execute(`
      SELECT * FROM ticket_purchases 
      WHERE user_id = ? AND status = 'reserved'
    `, [userId]);
    
    if (reservedTickets.length === 0) {
      return res.json({ success: false, message: 'No reservations found' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Get payment method ID for Stripe
      const [paymentMethods] = await db.execute(`
        SELECT payment_method_id FROM payment_methods WHERE method_code = 'stripe'
      `);
      const paymentMethodId = paymentMethods[0]?.payment_method_id || 1;
      
      // Update tickets and create payment records
      for (let i = 0; i < reservedTickets.length; i++) {
        const ticket = reservedTickets[i];
        const confirmationCode = 'FC' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        const uniqueTransactionRef = reservedTickets.length === 1 
          ? payment_intent_id 
          : `${payment_intent_id}_${i + 1}`;
        
        // Update ticket status
        await db.execute(`
          UPDATE ticket_purchases 
          SET status = 'confirmed', confirmation_code = ?, reservation_expires_at = NULL
          WHERE purchase_id = ?
        `, [confirmationCode, ticket.purchase_id]);
        
        // Create payment record
        await db.execute(`
          INSERT INTO payments (
            user_id, purchase_id, payment_method_id, amount, payment_type, 
            payment_status, transaction_reference, payment_date, completed_at
          ) VALUES (?, ?, ?, ?, 'ticket', 'completed', ?, NOW(), NOW())
        `, [userId, ticket.purchase_id, paymentMethodId, ticket.final_price, uniqueTransactionRef]);
      }
      
      // Update user's cashback if applicable
      const [memberships] = await db.execute(`
        SELECT um.*, mt.cashback_rate
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.tier_id
        WHERE um.user_id = ? AND um.status = 'active'
        ORDER BY um.created_at DESC LIMIT 1
      `, [userId]);
      
      if (memberships.length > 0) {
        const membership = memberships[0];
        const totalSpent = reservedTickets.reduce((sum, ticket) => sum + parseFloat(ticket.final_price), 0);
        const cashbackEarned = totalSpent * (parseFloat(membership.cashback_rate) / 100);
        
        if (cashbackEarned > 0) {
          await db.execute(`
            UPDATE user_memberships 
            SET cashback_accumulated = cashback_accumulated + ? 
            WHERE membership_id = ?
          `, [cashbackEarned, membership.membership_id]);
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Payment successful! Your tickets have been confirmed.',
        redirectUrl: '/my-tickets'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.json({ success: false, message: 'Error processing payment' });
  }
});

router.post('/confirm-membership-payment', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const { payment_intent_id, tier_id } = req.body;
    const userId = req.session.user.user_id;
    
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.json({ success: false, message: 'Payment not completed' });
    }
    
    // Get tier details
    const [tiers] = await db.execute('SELECT * FROM membership_tiers WHERE tier_id = ?', [tier_id]);
    
    if (tiers.length === 0) {
      return res.json({ success: false, message: 'Invalid membership tier' });
    }
    
    const tier = tiers[0];
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Calculate dates
      const joinDate = new Date();
      const expiryDate = new Date();
      const duration = parseInt(tier.duration_months);
      if (!isNaN(duration)) {
        expiryDate.setMonth(expiryDate.getMonth() + duration);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 12); // Default to 1 year
      }
            
      // Create membership
      const [membershipResult] = await db.execute(`
        INSERT INTO user_memberships (
          user_id, tier_id, join_date, expiry_date, status, 
          discount_percentage, cashback_accumulated
        ) VALUES (?, ?, ?, ?, 'active', ?, 0.00)
      `, [userId, tier_id, joinDate.toISOString().split('T')[0], 
          expiryDate.toISOString().split('T')[0], tier.discount_percentage]);
      
      // Get payment method ID
      const [paymentMethods] = await db.execute(`
        SELECT payment_method_id FROM payment_methods WHERE method_code = 'stripe'
      `);
      const paymentMethodId = paymentMethods[0]?.payment_method_id || 1;
      
      // Create payment record
      await db.execute(`
        INSERT INTO payments (
          user_id, membership_id, payment_method_id, amount, payment_type,
          payment_status, transaction_reference, payment_date, completed_at
        ) VALUES (?, ?, ?, ?, 'membership', 'completed', ?, NOW(), NOW())
      `, [userId, membershipResult.insertId, paymentMethodId, tier.price, payment_intent_id]);
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: `${tier.tier_name} membership activated successfully!`,
        redirectUrl: '/membership'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error confirming membership payment:', error);
    res.json({ success: false, message: 'Error processing membership payment' });
  }
});
router.post('/membership/purchase', isAuthenticated, async (req, res) => {
  try {
    const { tier_id } = req.body;
    const userId = req.session.user.user_id;
    
    // Redirect to membership payment page
    res.redirect(`/membership-payment/${tier_id}`);
    
  } catch (error) {
    console.error('Error initiating membership purchase:', error);
    res.redirect('/membership?error=purchase_failed');
  }
});

// Membership Renewal Route
router.post('/membership/renew', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Get user's most recent expired membership
    const [expiredMemberships] = await db.execute(`
      SELECT um.*, mt.* 
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status = 'expired'
      ORDER BY um.expiry_date DESC LIMIT 1
    `, [userId]);
    
    if (expiredMemberships.length === 0) {
      return res.redirect('/membership?error=no_expired_membership');
    }
    
    const expiredMembership = expiredMemberships[0];
    
    // Redirect to payment page for renewal
    res.redirect(`/membership-payment/${expiredMembership.tier_id}?renewal=true`);
    
  } catch (error) {
    console.error('Error initiating membership renewal:', error);
    res.redirect('/membership?error=renewal_failed');
  }
});
// Membership Payment Page Route
router.get('/membership-payment/:tierId', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const { tierId } = req.params;
    const userId = req.session.user.user_id;
    
    // Get tier details
    const [tiers] = await db.execute('SELECT * FROM membership_tiers WHERE tier_id = ?', [tierId]);
    
    if (tiers.length === 0) {
      return res.redirect('/membership?error=invalid_tier');
    }
    
    const tier = tiers[0];
    
    // Check if user already has active membership
    const [activeMemberships] = await db.execute(`
      SELECT * FROM user_memberships 
      WHERE user_id = ? AND status = 'active'
    `, [userId]);
    
    if (activeMemberships.length > 0) {
      return res.redirect('/membership?error=already_active');
    }
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(tier.price) * 100),
      currency: 'usd',
      metadata: {
        user_id: userId,
        purchase_type: 'membership',
        tier_id: tierId,
        tier_name: tier.tier_name
      }
    });
    
    res.render('membership-payment', {
      user: req.session.user,
      clientSecret: paymentIntent.client_secret,
      tierId: tierId,
      tierName: tier.tier_name,
      amount: tier.price,
      stripePublishableKey: stripeConfig.stripePublicKey
    });
    
  } catch (error) {
    console.error('Error loading membership payment page:', error);
    res.redirect('/membership?error=purchase_failed');
  }
});


module.exports = router;