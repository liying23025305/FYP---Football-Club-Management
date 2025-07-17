const express = require('express');
const { getConnection } = require('../models/db');
const { isAuthenticated } = require('../models/auth');
const stripe = require('stripe')(require('../config/stripe_config').stripeSecretKey);
const paypal = require('@paypal/checkout-server-sdk');
const router = express.Router();

// PayPal Configuration
const clientId = process.env.PAYPAL_CLIENT_ID || 'YOUR_SANDBOX_CLIENT_ID';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'YOUR_SANDBOX_CLIENT_SECRET';
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Unified Checkout Page
router.get('/unified-checkout', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Get user info
    const [userRows] = await db.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
    const user = userRows[0];
    
    // Get user's active membership and cashback
    const [membershipRows] = await db.execute(`
      SELECT um.cashback_accumulated, mt.tier_name, mt.cashback_rate, mt.discount_percentage
      FROM user_memberships um
      JOIN membership_tiers mt ON um.tier_id = mt.tier_id
      WHERE um.user_id = ? AND um.status = 'active'
      ORDER BY um.created_at DESC LIMIT 1
    `, [userId]);
    
    const membership = membershipRows.length > 0 ? {
      ...membershipRows[0],
      cashback_accumulated: parseFloat(membershipRows[0].cashback_accumulated) || 0,
      cashback_rate: parseFloat(membershipRows[0].cashback_rate) || 0,
      discount_percentage: parseFloat(membershipRows[0].discount_percentage) || 0
    } : {
      cashback_accumulated: 0,
      tier_name: 'None',
      cashback_rate: 0,
      discount_percentage: 0
    };
    
    // Get gear cart from session
    const gearCart = req.session.gear_cart || [];
    let gearTotal = 0;
    gearCart.forEach(item => {
      gearTotal += parseFloat(item.price_per_unit) * (item.quantity || 1);
    });
    
    // Get reserved tickets (using original schema structure)
    const [ticketRows] = await db.execute(`
      SELECT tp.*, e.event_name, e.event_date, e.ticket_price
      FROM ticket_purchases tp
      JOIN events e ON tp.event_id = e.event_id
      WHERE tp.user_id = ? AND tp.status = 'reserved'
    `, [userId]);
    
    let ticketTotal = 0;
    ticketRows.forEach(ticket => {
      // Use total_price from ticket_purchases or calculate from unit_price * quantity
      const ticketPrice = ticket.total_price || (ticket.unit_price * ticket.quantity) || ticket.ticket_price;
      ticketTotal += parseFloat(ticketPrice);
    });
    
    // Calculate totals with cashback
    const subtotal = gearTotal + ticketTotal;
    const membershipDiscount = subtotal * (membership.discount_percentage / 100);
    const totalAfterDiscount = subtotal - membershipDiscount;
    const cashbackToApply = Math.min(membership.cashback_accumulated, totalAfterDiscount);
    const finalTotal = totalAfterDiscount - cashbackToApply;
    const newCashbackEarned = finalTotal * (membership.cashback_rate / 100);
    
    res.render('unified-checkout', {
      user,
      membership,
      gearCart,
      reservedTickets: ticketRows,
      subtotal: subtotal.toFixed(2),
      membershipDiscount: membershipDiscount.toFixed(2),
      totalAfterDiscount: totalAfterDiscount.toFixed(2),
      cashbackToApply: cashbackToApply.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
      newCashbackEarned: newCashbackEarned.toFixed(2),
      stripePublishableKey: require('../config/stripe_config').stripePublishableKey
    });
  } catch (err) {
    console.error('Error loading unified checkout:', err);
    res.status(500).render('error', {
      message: 'Error loading checkout page',
      user: req.session.user
    });
  }
});

// Create Stripe Payment Intent
router.post('/create-payment-intent', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    const { usePaypal = false, cashbackToApply: customCashback } = req.body;
    
    // Recalculate totals with custom cashback amount
    const gearCart = req.session.gear_cart || [];
    const totals = await calculateTotalsWithCustomCashback(userId, db, gearCart, customCashback);
    
    if (!usePaypal) {
      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totals.finalTotal * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          user_id: userId.toString(),
          cashback_applied: totals.cashbackToApply.toString(),
          cashback_earned: totals.newCashbackEarned.toString(),
          membership_discount: totals.membershipDiscount.toString()
        }
      });
      
      res.json({
        client_secret: paymentIntent.client_secret,
        amount: totals.finalTotal
      });
    } else {
      res.json({ success: true, redirectToPaypal: true });
    }
  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ error: 'Payment processing error' });
  }
});

// Create PayPal Order
router.post('/paypal/create-order', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    const { cashbackToApply: customCashback } = req.body;
    
    const gearCart = req.session.gear_cart || [];
    const totals = await calculateTotalsWithCustomCashback(userId, db, gearCart, customCashback);
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: totals.finalTotal.toFixed(2)
        },
        description: 'Unified Purchase - Gear and Tickets',
        custom_id: JSON.stringify({
          user_id: userId,
          cashback_applied: totals.cashbackToApply,
          cashback_earned: totals.newCashbackEarned,
          membership_discount: totals.membershipDiscount
        })
      }],
      application_context: {
        return_url: `${req.protocol}://${req.get('host')}/unified-payments/paypal/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/unified-payments/paypal/cancel`
      }
    });
    
    const order = await paypalClient.execute(request);
    res.json({ id: order.result.id });
  } catch (err) {
    console.error('PayPal order creation error:', err);
    res.status(500).json({ error: 'PayPal order creation failed' });
  }
});

// Capture PayPal Payment
router.post('/paypal/capture/:orderID', isAuthenticated, async (req, res) => {
  try {
    const { orderID } = req.params;
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await paypalClient.execute(request);
    
    if (capture.result.status === 'COMPLETED') {
      const gearCart = req.session.gear_cart || [];
      await processSuccessfulPayment(userId, db, 'paypal', orderID, gearCart, req);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('PayPal capture error:', err);
    res.status(500).json({ error: 'Payment capture failed' });
  }
});

// Process Stripe Payment Success
router.post('/stripe/confirm-payment', isAuthenticated, async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status === 'succeeded') {
      const gearCart = req.session.gear_cart || [];
      await processSuccessfulPayment(userId, db, 'stripe', payment_intent_id, gearCart, req);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('Stripe confirmation error:', err);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

// Helper function to calculate totals
async function calculateTotals(userId, db, gearCart = []) {
  // Get user's active membership
  const [membershipRows] = await db.execute(`
    SELECT um.cashback_accumulated, mt.cashback_rate, mt.discount_percentage
    FROM user_memberships um
    JOIN membership_tiers mt ON um.tier_id = mt.tier_id
    WHERE um.user_id = ? AND um.status = 'active'
    ORDER BY um.created_at DESC LIMIT 1
  `, [userId]);
  
  const membership = membershipRows.length > 0 ? membershipRows[0] : {
    cashback_accumulated: 0,
    cashback_rate: 0,
    discount_percentage: 0
  };
  
  // Calculate gear total from provided cart
  let gearTotal = 0;
  gearCart.forEach(item => {
    gearTotal += parseFloat(item.price_per_unit) * (item.quantity || 1);
  });
  
  // Calculate ticket total (using original schema)
  const [ticketRows] = await db.execute(`
    SELECT total_price, unit_price, quantity FROM ticket_purchases tp
    JOIN events e ON tp.event_id = e.event_id
    WHERE tp.user_id = ? AND tp.status = 'reserved'
  `, [userId]);
  
  let ticketTotal = 0;
  ticketRows.forEach(ticket => {
    const ticketPrice = ticket.total_price || (ticket.unit_price * ticket.quantity);
    ticketTotal += parseFloat(ticketPrice || 0);
  });
  
  const subtotal = gearTotal + ticketTotal;
  const membershipDiscount = subtotal * (membership.discount_percentage / 100);
  const totalAfterDiscount = subtotal - membershipDiscount;
  const cashbackToApply = Math.min(membership.cashback_accumulated, totalAfterDiscount);
  const finalTotal = totalAfterDiscount - cashbackToApply;
  const newCashbackEarned = finalTotal * (membership.cashback_rate / 100);
  
  return {
    subtotal,
    membershipDiscount,
    totalAfterDiscount,
    cashbackToApply,
    finalTotal,
    newCashbackEarned,
    gearTotal,
    ticketTotal
  };
}

// Calculate totals with custom cashback amount
async function calculateTotalsWithCustomCashback(userId, db, gearCart = [], customCashback = null) {
  // Get user's active membership
  const [membershipRows] = await db.execute(`
    SELECT um.cashback_accumulated, mt.cashback_rate, mt.discount_percentage
    FROM user_memberships um
    JOIN membership_tiers mt ON um.tier_id = mt.tier_id
    WHERE um.user_id = ? AND um.status = 'active'
    ORDER BY um.created_at DESC LIMIT 1
  `, [userId]);
  
  const membership = membershipRows.length > 0 ? {
    ...membershipRows[0],
    cashback_accumulated: parseFloat(membershipRows[0].cashback_accumulated) || 0,
    cashback_rate: parseFloat(membershipRows[0].cashback_rate) || 0,
    discount_percentage: parseFloat(membershipRows[0].discount_percentage) || 0
  } : {
    cashback_accumulated: 0,
    cashback_rate: 0,
    discount_percentage: 0
  };
  
  // Calculate gear total from provided cart
  let gearTotal = 0;
  gearCart.forEach(item => {
    gearTotal += parseFloat(item.price_per_unit) * (item.quantity || 1);
  });
  
  // Calculate ticket total (using original schema)
  const [ticketRows] = await db.execute(`
    SELECT total_price, unit_price, quantity FROM ticket_purchases tp
    JOIN events e ON tp.event_id = e.event_id
    WHERE tp.user_id = ? AND tp.status = 'reserved'
  `, [userId]);
  
  let ticketTotal = 0;
  ticketRows.forEach(ticket => {
    const ticketPrice = ticket.total_price || (ticket.unit_price * ticket.quantity);
    ticketTotal += parseFloat(ticketPrice || 0);
  });
  
  const subtotal = gearTotal + ticketTotal;
  const membershipDiscount = subtotal * (membership.discount_percentage / 100);
  const totalAfterDiscount = subtotal - membershipDiscount;
  
  // Use custom cashback if provided, otherwise use maximum available
  let cashbackToApply;
  if (customCashback !== null && customCashback !== undefined) {
    cashbackToApply = Math.min(parseFloat(customCashback) || 0, membership.cashback_accumulated, totalAfterDiscount);
  } else {
    cashbackToApply = Math.min(membership.cashback_accumulated, totalAfterDiscount);
  }
  
  const finalTotal = Math.max(0, totalAfterDiscount - cashbackToApply);
  const newCashbackEarned = finalTotal * (membership.cashback_rate / 100);
  
  return {
    subtotal,
    membershipDiscount,
    totalAfterDiscount,
    cashbackToApply,
    finalTotal,
    newCashbackEarned,
    gearTotal,
    ticketTotal
  };
}

// Helper function to process successful payment
async function processSuccessfulPayment(userId, db, paymentMethod, transactionId, gearCart = [], req = null) {
  try {
    await db.query('START TRANSACTION');
    
    const totals = await calculateTotals(userId, db, gearCart);
    
    // Get payment method ID
    const [paymentMethodRows] = await db.execute(
      'SELECT payment_method_id FROM payment_methods WHERE method_name = ?',
      [paymentMethod === 'stripe' ? 'Stripe' : 'PayPal']
    );
    
    let paymentMethodId = paymentMethodRows.length > 0 ? paymentMethodRows[0].payment_method_id : 1;
    
    // Create unified payment record
    const [paymentResult] = await db.execute(`
      INSERT INTO payments (amount, payment_type, payment_status, transaction_reference, user_id, payment_method_id)
      VALUES (?, 'unified', 'completed', ?, ?, ?)
    `, [totals.finalTotal, transactionId, userId, paymentMethodId]);
    
    const paymentId = paymentResult.insertId;
    
    // Process gear orders if any
    if (totals.gearTotal > 0) {
      // Create order
      const [orderResult] = await db.execute(`
        INSERT INTO orders (total_amount, discount_applied, final_amount, status, user_id)
        VALUES (?, ?, ?, 'confirmed', ?)
      `, [totals.gearTotal, totals.membershipDiscount, totals.gearTotal - (totals.membershipDiscount * (totals.gearTotal / totals.subtotal)), userId]);
      
      const orderId = orderResult.insertId;
      
      // Create order items
      for (const item of gearCart) {
        await db.execute(`
          INSERT INTO order_items (quantity, unit_price, total_price, order_id, gear_id)
          VALUES (?, ?, ?, ?, ?)
        `, [item.quantity || 1, item.price_per_unit, parseFloat(item.price_per_unit) * (item.quantity || 1), orderId, item.gear_id]);
        
        // Update gear inventory
        await db.execute(`
          UPDATE gear SET gear_quantity = gear_quantity - ? WHERE gear_id = ?
        `, [item.quantity || 1, item.gear_id]);
      }
      
      // Clear gear cart if req is available
      if (req && req.session) {
        req.session.gear_cart = [];
      }
    }
    
    // Process ticket purchases (using original schema)
    if (totals.ticketTotal > 0) {
      // Update ticket_purchases status to confirmed
      // In original schema, we just update the status without linking to payment_id
      await db.execute(`
        UPDATE ticket_purchases SET status = 'confirmed'
        WHERE user_id = ? AND status = 'reserved'
      `, [userId]);
    }
    
    // Update user cashback
    if (totals.cashbackToApply > 0 || totals.newCashbackEarned > 0) {
      // Get current cashback balance
      const [currentBalance] = await db.execute(
        'SELECT cashback_accumulated FROM user_memberships WHERE user_id = ? AND status = "active"', 
        [userId]
      );
      
      if (currentBalance.length > 0) {
        const currentCashback = parseFloat(currentBalance[0].cashback_accumulated) || 0;
        const newCashbackBalance = currentCashback - totals.cashbackToApply + totals.newCashbackEarned;
        
        await db.execute(`
          UPDATE user_memberships SET cashback_accumulated = ?
          WHERE user_id = ? AND status = 'active'
        `, [Math.max(0, newCashbackBalance), userId]);
      }
    }
    
    await db.query('COMMIT');
    
    // Send confirmation email (if email service is configured)
    try {
      const emailService = require('../services/emailService');
      await emailService.sendPaymentConfirmation(userId, {
        totalAmount: totals.finalTotal,
        cashbackUsed: totals.cashbackToApply,
        cashbackEarned: totals.newCashbackEarned,
        transactionId
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the payment if email fails
    }
    
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

// PayPal Success Route
router.get('/paypal/success', isAuthenticated, (req, res) => {
  res.render('paymentsuccess', {
    user: req.session.user,
    message: 'Your payment was successful! Your order has been confirmed.'
  });
});

// PayPal Cancel Route
router.get('/paypal/cancel', isAuthenticated, (req, res) => {
  res.render('paymentcancel', {
    user: req.session.user,
    message: 'Your payment was cancelled. You can try again anytime.'
  });
});

// Success Route for Stripe
router.get('/success', isAuthenticated, (req, res) => {
  res.render('paymentsuccess', {
    user: req.session.user,
    message: 'Your payment was successful! Your order has been confirmed.'
  });
});

module.exports = router;
