const express = require('express');
const { getConnection } = require('../models/db');
const { isAuthenticated, isAdmin, canAccessProfile } = require('../models/auth');
const { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships } = require('../middleware/validation'); 
const stripe = require('stripe')(require('../config/stripe_config').stripeSecretKey);
const stripeConfig = require('../config/stripe_config.js');
const router = express.Router();

// User membership routes
router.get('/membership', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    
    // Check for expired memberships
    await checkExpiredMemberships();
    
    // Get all active membership tiers
    const [tiers] = await db.execute(`
      SELECT * FROM membership_tiers 
      WHERE active = 1 
      ORDER BY display_order, price ASC
    `);
    
    // Get user's current membership
    const [memberships] = await db.execute(`
      SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
             DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status IN ('active', 'expired')
      ORDER BY um.created_at DESC
      LIMIT 1
    `, [req.session.user.user_id]);
    
    const currentMembership = memberships.length > 0 ? memberships[0] : null;
    
    res.render('membership', {
      user: req.session.user,
      tiers,
      currentMembership,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Membership page error:', error);
    res.status(500).render('error', {
      message: 'An error occurred while loading membership information',
      user: req.session.user
    });
  }
});


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