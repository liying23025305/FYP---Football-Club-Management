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
    
    // Get user's recent order history (last 3 orders) - include all statuses
    const [recentOrders] = await db.execute(`
      SELECT o.*, COUNT(oi.order_items_id) as total_items,
             SUM(oi.quantity * oi.unit_price) as calculated_total
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.order_id
      ORDER BY o.order_date DESC
      LIMIT 3
    `, [req.session.user.user_id]);
    
    // Debug logging
    console.log('User ID:', req.session.user.user_id);
    console.log('Recent orders found:', recentOrders.length);
    console.log('Recent orders data:', recentOrders);
    
    // Debug: Check what we're getting
    console.log('Membership data:', membership);
    if (membership) {
      console.log('Cashback accumulated:', membership.cashback_accumulated);
    }
    
    res.render('profile', { 
      user, 
      membership,
      recentOrders,
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
        // Get membership and recent orders for error display
        const [memberships] = await db.execute(`
          SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
                 DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
          FROM user_memberships um
          JOIN membership_tiers mt ON um.tier_id = mt.tier_id
          WHERE um.user_id = ? AND um.status = 'active'
          ORDER BY um.created_at DESC
          LIMIT 1
        `, [req.session.user.user_id]);
        
        const [recentOrders] = await db.execute(`
          SELECT o.*, COUNT(oi.order_items_id) as total_items
          FROM orders o
          LEFT JOIN order_items oi ON o.order_id = oi.order_id
          WHERE o.user_id = ? AND o.status IN ('confirmed', 'shipped', 'delivered')
          GROUP BY o.order_id
          ORDER BY o.order_date DESC
          LIMIT 3
        `, [req.session.user.user_id]);
        
        return res.render('profile', {
          user: { ...user, ...req.body },
          membership: memberships.length > 0 ? memberships[0] : null,
          recentOrders,
          error: 'Email address already exists for another user'
        });
      }
    }
    
    // If password change is requested
    if (new_password) {
      if (!current_password) {
        // Get membership and recent orders for error display
        const [memberships] = await db.execute(`
          SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
                 DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
          FROM user_memberships um
          JOIN membership_tiers mt ON um.tier_id = mt.tier_id
          WHERE um.user_id = ? AND um.status = 'active'
          ORDER BY um.created_at DESC
          LIMIT 1
        `, [req.session.user.user_id]);
        
        const [recentOrders] = await db.execute(`
          SELECT o.*, COUNT(oi.order_items_id) as total_items
          FROM orders o
          LEFT JOIN order_items oi ON o.order_id = oi.order_id
          WHERE o.user_id = ? AND o.status IN ('confirmed', 'shipped', 'delivered')
          GROUP BY o.order_id
          ORDER BY o.order_date DESC
          LIMIT 3
        `, [req.session.user.user_id]);
        
        return res.render('profile', {
          user: { ...user, ...req.body },
          membership: memberships.length > 0 ? memberships[0] : null,
          recentOrders,
          error: 'Current password is required to change password'
        });
      }
      
      if (new_password !== confirm_password) {
        // Get membership and recent orders for error display
        const [memberships] = await db.execute(`
          SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
                 DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
          FROM user_memberships um
          JOIN membership_tiers mt ON um.tier_id = mt.tier_id
          WHERE um.user_id = ? AND um.status = 'active'
          ORDER BY um.created_at DESC
          LIMIT 1
        `, [req.session.user.user_id]);
        
        const [recentOrders] = await db.execute(`
          SELECT o.*, COUNT(oi.order_items_id) as total_items
          FROM orders o
          LEFT JOIN order_items oi ON o.order_id = oi.order_id
          WHERE o.user_id = ? AND o.status IN ('confirmed', 'shipped', 'delivered')
          GROUP BY o.order_id
          ORDER BY o.order_date DESC
          LIMIT 3
        `, [req.session.user.user_id]);
        
        return res.render('profile', {
          user: { ...user, ...req.body },
          membership: memberships.length > 0 ? memberships[0] : null,
          recentOrders,
          error: 'New passwords do not match'
        });
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, user.password);
      if (!isValidPassword) {
        // Get membership and recent orders for error display
        const [memberships] = await db.execute(`
          SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
                 DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
          FROM user_memberships um
          JOIN membership_tiers mt ON um.tier_id = mt.tier_id
          WHERE um.user_id = ? AND um.status = 'active'
          ORDER BY um.created_at DESC
          LIMIT 1
        `, [req.session.user.user_id]);
        
        const [recentOrders] = await db.execute(`
          SELECT o.*, COUNT(oi.order_items_id) as total_items
          FROM orders o
          LEFT JOIN order_items oi ON o.order_id = oi.order_id
          WHERE o.user_id = ? AND o.status IN ('confirmed', 'shipped', 'delivered')
          GROUP BY o.order_id
          ORDER BY o.order_date DESC
          LIMIT 3
        `, [req.session.user.user_id]);
        
        return res.render('profile', {
          user: { ...user, ...req.body },
          membership: memberships.length > 0 ? memberships[0] : null,
          recentOrders,
          error: 'Current password is incorrect'
        });
      }
      
      // Validate new password
      const passwordErrors = validatePassword(new_password, user.username, email);
      if (passwordErrors.length > 0) {
        // Get membership and recent orders for error display
        const [memberships] = await db.execute(`
          SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
                 DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
          FROM user_memberships um
          JOIN membership_tiers mt ON um.tier_id = mt.tier_id
          WHERE um.user_id = ? AND um.status = 'active'
          ORDER BY um.created_at DESC
          LIMIT 1
        `, [req.session.user.user_id]);
        
        const [recentOrders] = await db.execute(`
          SELECT o.*, COUNT(oi.order_items_id) as total_items
          FROM orders o
          LEFT JOIN order_items oi ON o.order_id = oi.order_id
          WHERE o.user_id = ? AND o.status IN ('confirmed', 'shipped', 'delivered')
          GROUP BY o.order_id
          ORDER BY o.order_date DESC
          LIMIT 3
        `, [req.session.user.user_id]);
        
        return res.render('profile', {
          user: { ...user, ...req.body },
          membership: memberships.length > 0 ? memberships[0] : null,
          recentOrders,
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
    
    // Get membership and recent orders for error display
    try {
      const db = getConnection();
      const [memberships] = await db.execute(`
        SELECT um.*, mt.tier_name, mt.tier_desc, mt.discount_percentage, mt.cashback_rate,
               DATEDIFF(um.expiry_date, CURDATE()) as days_remaining
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.tier_id
        WHERE um.user_id = ? AND um.status = 'active'
        ORDER BY um.created_at DESC
        LIMIT 1
      `, [req.session.user.user_id]);
      
      const [recentOrders] = await db.execute(`
        SELECT o.*, COUNT(oi.order_items_id) as total_items
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.user_id = ? AND o.status IN ('confirmed', 'shipped', 'delivered')
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
        LIMIT 3
      `, [req.session.user.user_id]);
      
      res.render('profile', {
        user: req.body,
        membership: memberships.length > 0 ? memberships[0] : null,
        recentOrders,
        error: 'An error occurred while updating your profile'
      });
    } catch (dbError) {
      console.error('Database error while handling profile error:', dbError);
      res.render('profile', {
        user: req.body,
        membership: null,
        recentOrders: [],
        error: 'An error occurred while updating your profile'
      });
    }
  }
});

// Get full order history for user
router.get('/profile/order-history', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    
    console.log('Fetching order history for user:', req.session.user.user_id);
    
    // Check if refund_requests table exists
    let refundTableExists = true;
    try {
      await db.execute('SELECT 1 FROM refund_requests LIMIT 1');
    } catch (tableError) {
      if (tableError.message.includes("doesn't exist")) {
        refundTableExists = false;
        console.log('Refund table does not exist');
      } else {
        throw tableError;
      }
    }
    
    // Get orders with proper column names - include all statuses for debugging
    let orderQuery;
    if (refundTableExists) {
      orderQuery = `
        SELECT o.*, 
               COUNT(oi.order_items_id) as total_items,
               SUM(oi.quantity * oi.unit_price) as total_amount,
               COALESCE(rr.status, 'none') as refund_status,
               rr.refund_id
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN refund_requests rr ON o.order_id = rr.order_id
        WHERE o.user_id = ?
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
      `;
    } else {
      orderQuery = `
        SELECT o.*, 
               COUNT(oi.order_items_id) as total_items,
               SUM(oi.quantity * oi.unit_price) as total_amount,
               'none' as refund_status,
               NULL as refund_id
        FROM orders o
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.user_id = ?
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
      `;
    }
    
    const [orders] = await db.execute(orderQuery, [req.session.user.user_id]);
    console.log('Found orders:', orders.length);

    // Get detailed items for each order
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const [items] = await db.execute(`
        SELECT oi.*, g.gear_name, g.gear_image, g.price_per_unit
        FROM order_items oi
        JOIN gear g ON oi.gear_id = g.gear_id
        WHERE oi.order_id = ?
      `, [order.order_id]);
      
      console.log(`Order ${order.order_id} has ${items.length} items`);
      
      return {
        ...order,
        items: items
      };
    }));

    res.render('my_orders', { 
      user: req.session.user,
      orders: ordersWithItems 
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).render('error', { 
      message: 'Failed to load order history',
      user: req.session.user 
    });
  }
});

// Add item to cart from order history
router.post('/profile/reorder/:gearId', isAuthenticated, async (req, res) => {
  try {
    const { gearId } = req.params;
    const { quantity = 1 } = req.body;

    const db = getConnection();
    // Check if gear exists and is in stock
    const [gear] = await db.execute(
      'SELECT * FROM gear WHERE gear_id = ? AND gear_quantity >= ?',
      [gearId, quantity]
    );

    if (gear.length === 0) {
      return res.json({ success: false, message: 'Item not available or out of stock' });
    }


    // Use main gear_cart for cart operations
    if (!req.session.gear_cart) {
      req.session.gear_cart = [];
    }
    const existingItem = req.session.gear_cart.find(item => item.gear_id == gearId);
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      req.session.gear_cart.push({
        gear_id: gearId,
        gear_name: gear[0].gear_name || gear[0].name,
        price_per_unit: gear[0].price_per_unit || gear[0].price,
        quantity: parseInt(quantity),
        gear_image: gear[0].gear_image || gear[0].image_url,
        gear_desc: gear[0].gear_desc || ''
      });
    }

    res.json({ success: true, message: 'Item added to cart successfully' });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

// Debug route to check orders (remove in production)
router.get('/profile/debug-orders', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    
    // Check all orders for this user regardless of status
    const [allOrders] = await db.execute(`
      SELECT o.*, 
             COUNT(oi.order_items_id) as total_items,
             SUM(oi.quantity * oi.unit_price) as calculated_total
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.order_id
      ORDER BY o.order_date DESC
    `, [req.session.user.user_id]);

    // Check if there are any orders at all in the system
    const [totalOrders] = await db.execute('SELECT COUNT(*) as total FROM orders');
    
    // Check gear table for images
    const [gearSample] = await db.execute('SELECT gear_id, gear_name, gear_image FROM gear LIMIT 5');
    
    res.json({
      user_id: req.session.user.user_id,
      user_orders: allOrders,
      total_orders_in_system: totalOrders[0].total,
      gear_sample: gearSample,
      debug_timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test route to create sample order (remove in production)
router.post('/profile/create-test-order', isAuthenticated, async (req, res) => {
  try {
    const db = getConnection();
    const userId = req.session.user.user_id;
    
    // Check if gear exists
    const [gearCheck] = await db.execute('SELECT gear_id FROM gear LIMIT 1');
    if (gearCheck.length === 0) {
      return res.json({ error: 'No gear items found in database' });
    }
    
    // Create test order
    const [orderResult] = await db.execute(`
      INSERT INTO orders (user_id, total_amount, final_amount, status, order_date)
      VALUES (?, 30.00, 30.00, 'confirmed', NOW())
    `, [userId]);
    
    const orderId = orderResult.insertId;
    
    // Create test order item
    await db.execute(`
      INSERT INTO order_items (order_id, gear_id, quantity, unit_price, total_price)
      VALUES (?, ?, 1, 30.00, 30.00)
    `, [orderId, gearCheck[0].gear_id]);
    
    res.json({ 
      success: true, 
      message: 'Test order created',
      orderId: orderId 
    });
  } catch (error) {
    console.error('Error creating test order:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;