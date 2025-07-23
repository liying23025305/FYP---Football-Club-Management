const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const { isAuthenticated, isAdmin } = require('../models/auth');

// Database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mydb'
});

// --- ADMIN REFUND ROUTES ---

// Admin view for refund requests
router.get('/admin/refund-requests', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Check if refund_requests table exists
    const [tableCheck] = await connection.promise().query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'refund_requests'
    `);
    if (tableCheck[0].count === 0) {
      return res.render('admin_refund_requests', {
        user: req.session.user,
        refundRequests: {
          pending: [],
          approved: [],
          rejected: [],
          processed: [],
          all: []
        },
        error: 'Refund system is not yet configured. Please run the database setup script.'
      });
    }
    
    // Get all refund requests with order and user details
    const [refundRequests] = await connection.promise().query(`
      SELECT 
        rr.*,
        o.order_id, o.order_date, o.total_amount as order_total, o.final_amount, o.status as order_status,
        u.first_name, u.surname, u.email, u.phone,
        p.transaction_reference,
        p.amount as payment_amount,
        GROUP_CONCAT(
          CONCAT(g.gear_name, ' (Qty: ', oi.quantity, ', Price: $', oi.unit_price, ')')
          SEPARATOR '; '
        ) as order_items
      FROM refund_requests rr
      JOIN orders o ON rr.order_id = o.order_id
      JOIN users u ON rr.user_id = u.user_id
      LEFT JOIN payments p ON rr.payment_id = p.payment_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN gear g ON oi.gear_id = g.gear_id
      GROUP BY rr.refund_id, o.order_id, u.user_id, p.payment_id
      ORDER BY rr.requested_at DESC
    `);
    
    // Group by status
    const pending = refundRequests.filter(req => req.status === 'pending');
    const approved = refundRequests.filter(req => req.status === 'approved');
    const rejected = refundRequests.filter(req => req.status === 'rejected');
    const processed = refundRequests.filter(req => req.status === 'processed');
    
    res.render('admin_refund_requests', {
      user: req.session.user,
      refundRequests: {
        pending,
        approved,
        rejected,
        processed,
        all: refundRequests
      }
    });
  } catch (error) {
    console.error('Error loading refund requests:', error);
    const errorMessage = error.message && error.message.includes('refund_requests') && error.message.includes("doesn't exist")
      ? 'Refund system database tables are not set up. Please run the database setup script.'
      : 'Failed to load refund requests';
    res.render('admin_refund_requests', {
      user: req.session.user,
      refundRequests: {
        pending: [],
        approved: [],
        rejected: [],
        processed: [],
        all: []
      },
      error: errorMessage
    });
  }
});

// Admin process refund requests
router.post('/admin/refund-requests/:refundId/process', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { refundId } = req.params;
    const { action, admin_notes } = req.body;
    const adminId = req.session.user.user_id;
    
    // Get refund request details
    const [refundResults] = await connection.promise().query(
      'SELECT * FROM refund_requests WHERE refund_id = ?',
      [refundId]
    );
    
    if (refundResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Refund request not found' });
    }
    
    const refundRequest = refundResults[0];
    
    if (action === 'approve') {
      await connection.promise().query(`
        UPDATE refund_requests 
        SET status = 'approved', admin_notes = ?, processed_at = NOW(), processed_by = ?
        WHERE refund_id = ?
      `, [admin_notes, adminId, refundId]);
      
      res.json({ success: true, message: 'Refund request approved successfully' });
    } else if (action === 'reject') {
      await connection.promise().query(`
        UPDATE refund_requests 
        SET status = 'rejected', admin_notes = ?, processed_at = NOW(), processed_by = ?
        WHERE refund_id = ?
      `, [admin_notes, adminId, refundId]);
      
      res.json({ success: true, message: 'Refund request rejected successfully' });
    } else if (action === 'process') {
      await connection.promise().query(`
        UPDATE refund_requests 
        SET status = 'processed', admin_notes = ?, processed_at = NOW(), processed_by = ?
        WHERE refund_id = ?
      `, [admin_notes, adminId, refundId]);
      
      // Update order status to refunded
      await connection.promise().query(
        'UPDATE orders SET status = "refunded" WHERE order_id = ?',
        [refundRequest.order_id]
      );
      
      // Find and update payment status using payment_id from refund_requests
      if (refundRequest.payment_id) {
        await connection.promise().query(
          'UPDATE payments SET payment_status = "refunded" WHERE payment_id = ?',
          [refundRequest.payment_id]
        );
      }
      
      res.json({ success: true, message: 'Refund marked as processed successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error processing refund request:', error);
    res.status(500).json({ success: false, message: 'Error processing refund request' });
  }
});

// Admin refund order directly (from admin orders page)
router.post('/admin/orders/:orderId/refund', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const adminId = req.session.user.user_id;
    
    // Get order details
    const [orderResults] = await connection.promise().query(`
      SELECT o.*, u.first_name, u.surname, u.email, u.user_id
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `, [orderId]);
    
    if (orderResults.length === 0) {
      return res.status(404).send('Order not found');
    }
    
    const order = orderResults[0];
    
    // Check if refund already exists
    const [existingRefund] = await connection.promise().query(
      'SELECT * FROM refund_requests WHERE order_id = ?',
      [orderId]
    );
    
    let refundId;
    if (existingRefund.length === 0) {
      // Create refund request
      const [refundResult] = await connection.promise().query(`
        INSERT INTO refund_requests (
          order_id, user_id, reason, refund_amount, original_order_amount, 
          status, requested_at, processed_by
        ) VALUES (?, ?, 'Admin initiated refund', ?, ?, 'approved', NOW(), ?)
      `, [
        orderId, 
        order.user_id, 
        order.final_amount,
        order.final_amount,
        adminId
      ]);
      refundId = refundResult.insertId;
    } else {
      refundId = existingRefund[0].refund_id;
      // Update existing refund to approved
      await connection.promise().query(`
        UPDATE refund_requests 
        SET status = 'approved', processed_at = NOW(), processed_by = ?
        WHERE refund_id = ?
      `, [adminId, refundId]);
    }
    
    // Update order and payment status
    await connection.promise().query(
      'UPDATE orders SET status = "refunded" WHERE order_id = ?',
      [orderId]
    );
    
    // Find and update payment status using payment_id from refund_requests
    if (refundId && existingRefund.length > 0 && existingRefund[0].payment_id) {
      await connection.promise().query(
        'UPDATE payments SET payment_status = "refunded" WHERE payment_id = ?',
        [existingRefund[0].payment_id]
      );
    }
    
    // Send refund email
    try {
      const { sendEmail } = require('../services/emailService');
      const customerName = `${order.first_name} ${order.surname}`;
      await sendEmail(order.email, 'refundApproved', customerName, orderId, order.final_amount);
    } catch (emailError) {
      console.error('Error sending refund email:', emailError);
    }
    
    res.redirect('/admin/orders?success=Order refunded successfully');
  } catch (error) {
    console.error('Error processing admin refund:', error);
    res.status(500).send('Error processing refund');
  }
});

// --- USER REFUND ROUTES ---

// Show refund form for a specific order
router.get('/orders/:orderId/refund-request', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user.user_id;
    // Check if refund_requests table exists
    try {
      await connection.promise().query('SELECT 1 FROM refund_requests LIMIT 1');
    } catch (tableError) {
      if (tableError.message.includes("doesn't exist")) {
        return res.status(500).render('error', { 
          message: 'Refund system is not yet configured. Please contact administrator.' 
        });
      }
      throw tableError;
    }
    // Get order details with items
    const [orderResults] = await connection.promise().query(`
      SELECT o.*, COUNT(oi.order_items_id) as total_items,
             SUM(oi.quantity * oi.unit_price) as total_amount
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.order_id = ? AND o.user_id = ? AND o.status NOT IN ('cancelled', 'refunded')
      GROUP BY o.order_id
    `, [orderId, userId]);
    if (orderResults.length === 0) {
      return res.status(404).render('error', { 
        message: 'Order not found or not eligible for refund' 
      });
    }
    const order = orderResults[0];
    // Check if refund already requested
    const [existingRefund] = await connection.promise().query(
      'SELECT * FROM refund_requests WHERE order_id = ? AND user_id = ?',
      [orderId, userId]
    );
    if (existingRefund.length > 0) {
      return res.render('refund_request', {
        user: req.session.user,
        order,
        existingRefund: existingRefund[0],
        message: 'A refund request already exists for this order'
      });
    }
    // Get order items
    const [orderItems] = await connection.promise().query(`
      SELECT oi.*, g.gear_name, g.gear_image
      FROM order_items oi
      JOIN gear g ON oi.gear_id = g.gear_id
      WHERE oi.order_id = ?
    `, [orderId]);
    res.render('refund_request', {
      user: req.session.user,
      order: { ...order, items: orderItems },
      existingRefund: null
    });
  } catch (error) {
    console.error('Error loading refund form:', error);
    res.status(500).render('error', { 
      message: 'Failed to load refund form',
      user: req.session.user 
    });
  }
});

// Submit refund request
router.post('/orders/:orderId/refund-request', isAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user.user_id;
    const { reason, detailed_reason } = req.body;
    // Check if refund_requests table exists
    try {
      await connection.promise().query('SELECT 1 FROM refund_requests LIMIT 1');
    } catch (tableError) {
      if (tableError.message.includes("doesn't exist")) {
        return res.status(500).json({ 
          success: false, 
          message: 'Refund system is not yet configured. Please contact administrator.' 
        });
      }
      throw tableError;
    }
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Reason is required' 
      });
    }
    // Verify order belongs to user and is eligible for refund
    const [orderResults] = await connection.promise().query(`
      SELECT o.*, p.payment_id, p.amount as amount_paid, o.final_amount
      FROM orders o
      LEFT JOIN payments p ON o.user_id = p.user_id AND p.payment_type = 'gear'
      WHERE o.order_id = ? AND o.user_id = ? AND o.status NOT IN ('cancelled', 'refunded')
      LIMIT 1
    `, [orderId, userId]);
    if (orderResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found or not eligible for refund' 
      });
    }
    const order = orderResults[0];
    // Check if refund already requested
    const [existingRefund] = await connection.promise().query(
      'SELECT * FROM refund_requests WHERE order_id = ? AND user_id = ?',
      [orderId, userId]
    );
    if (existingRefund.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'A refund request already exists for this order' 
      });
    }
    // Create refund request with comprehensive data
    const [refundResult] = await connection.promise().query(`
      INSERT INTO refund_requests (
        order_id, user_id, payment_id, reason, detailed_reason, 
        refund_amount, original_order_amount, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      orderId, 
      userId, 
      order.payment_id || null, 
      reason, 
      detailed_reason || null,
      order.final_amount,
      order.final_amount,
    ]);
    // Insert into refund audit log (optional - don't fail if table doesn't exist)
    try {
      await connection.promise().query(`
        INSERT INTO refund_audit_log (
          refund_id, action, action_by, action_details, created_at
        ) VALUES (?, 'created', ?, ?, NOW())
      `, [
        refundResult.insertId,
        userId,
        JSON.stringify({
          action: 'refund_request_created',
          reason: reason,
          detailed_reason: detailed_reason,
          amount: order.amount_paid || order.final_amount
        })
      ]);
    } catch (auditError) {
      console.error('Audit log insertion failed (non-critical):', auditError.message);
    }
    // Update order refund status (optional - don't fail if column doesn't exist)
    // Note: refund_status column may not exist in the base orders table
    // Orders will be tracked via the refund_requests table instead
    // Send refund request confirmation email
    try {
      const { sendEmail } = require('../services/emailService');
      const customerName = `${req.session.user.first_name} ${req.session.user.surname}`;
      await sendEmail(
        req.session.user.email,
        'refundRequested',
        customerName,
        orderId,
        order.final_amount
      );
    } catch (emailError) {
      console.error('Error sending refund request email:', emailError);
      // Don't fail the request if email fails
    }
    // If AJAX request, respond with JSON
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      return res.json({
        success: true,
        message: 'Refund request submitted successfully. You will receive a confirmation email shortly.'
      });
    }
    // Otherwise, redirect to success page
    res.redirect('/refund-success');
  } catch (error) {
    console.error('Error submitting refund request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit refund request' 
    });
  }
});

// Refund success page
router.get('/refund-success', isAuthenticated, (req, res) => {
  res.render('refund_success', {
    user: req.session.user
  });
});

module.exports = router;
