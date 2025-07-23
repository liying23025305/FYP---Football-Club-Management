const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// Remove a pending order (user-initiated)
router.post('/orders/:orderId/remove', async (req, res) => {
  const user = req.session.user;
  const orderId = req.params.orderId;
  if (!user) return res.status(401).send('Not logged in');
  try {
    // Only allow removing pending orders
    const [orders] = await connection.promise().query(
      'SELECT * FROM orders WHERE order_id = ? AND user_id = ? AND status = "pending"',
      [orderId, user.user_id]
    );
    if (!orders.length) return res.status(403).send('Order not found or not pending');
    // Delete order items first (FK constraint)
    await connection.promise().query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    // Delete the order
    await connection.promise().query('DELETE FROM orders WHERE order_id = ?', [orderId]);
    res.redirect('/my-orders');
  } catch (err) {
    console.error('Error removing pending order:', err);
    res.status(500).send('Error removing order');
  }
});

// Update credentials for XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // default for XAMPP
  database: 'mydb'
});

// Ensure session gear_cart exists
function ensuregear_cartSession(req) {
  if (!req.session.gear_cart) {
    req.session.gear_cart = [];
  }
}

// Show store page with category and search filtering
router.get('/store', async (req, res) => {
  try {
    const category = req.query.category;
    const search = req.query.search;
    const priceRange = req.query.priceRange ? Number(req.query.priceRange) : 1000;
    const size = req.query.size && req.query.size !== 'All' ? req.query.size : null;
    const sizeKids = req.query.sizeKids && req.query.sizeKids !== 'All' ? req.query.sizeKids : null;
    const sortBy = req.query.sortBy || 'featured';

    // Get all unique categories from gear table
    const [catResults] = await connection.promise().query('SELECT DISTINCT category FROM gear WHERE category IS NOT NULL AND category != ""');
    const categories = catResults.map(row => row.category).filter(Boolean);

    // Build SQL query with filters
    let sql = 'SELECT * FROM gear WHERE 1=1';
    let params = [];
    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (size) {
      sql += ' AND (size = ? OR size IS NULL OR size = "")'; // If you have size column, otherwise skip
      params.push(size);
    }
    if (sizeKids) {
      sql += ' AND (size_kids = ? OR size_kids IS NULL OR size_kids = "")'; // If you have size_kids column
      params.push(sizeKids);
    }
    if (search) {
      sql += ' AND gear_name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' AND price_per_unit <= ?';
    params.push(priceRange);

    // Sorting
    if (sortBy === 'priceLow') {
      sql += ' ORDER BY price_per_unit ASC';
    } else if (sortBy === 'priceHigh') {
      sql += ' ORDER BY price_per_unit DESC';
    } else if (sortBy === 'name') {
      sql += ' ORDER BY gear_name ASC';
    } else {
      sql += ' ORDER BY gear_id DESC'; // featured or default
    }

    const [results] = await connection.promise().query(sql, params);
    let products = results.map(item => ({
      id: item.gear_id,
      name: item.gear_name,
      image: item.gear_image,
      price: Number(item.price_per_unit).toFixed(2),
      category: item.category
    }));

    // Find most popular (example: highest price, or you can use your own logic)
    let mostPopular = null;
    if (products.length > 0 && (!category || category === 'All') && !search) {
      mostPopular = products.reduce((a, b) => (parseFloat(a.price) > parseFloat(b.price) ? a : b));
    }
    ensuregear_cartSession(req);
    res.render('store', {
      products,
      mostPopular,
      gear_cart: req.session.gear_cart,
      cart: req.session.gear_cart || [],
      selectedCategory: typeof category !== 'undefined' ? category : 'All',
      searchQuery: typeof search !== 'undefined' ? search : '',
      priceRange: typeof priceRange !== 'undefined' ? priceRange : 1000,
      categories,
      selectedSize: typeof req.query.size !== 'undefined' ? req.query.size : 'All',
      selectedSizeKids: typeof req.query.sizeKids !== 'undefined' ? req.query.sizeKids : 'All',
      sortBy: typeof sortBy !== 'undefined' ? sortBy : 'featured'
    });
  } catch (err) {
    console.error('Error fetching gear:', err);
    // Ensure categories is always defined, even on error
    let categories = [];
    try {
      const [catResults] = await connection.promise().query('SELECT DISTINCT category FROM gear WHERE category IS NOT NULL AND category != ""');
      categories = catResults.map(row => row.category).filter(Boolean);
    } catch (e) {}
    res.render('store', {
      products: [],
      mostPopular: null,
      gear_cart: req.session.gear_cart,
      cart: req.session.gear_cart || [],
      selectedCategory: 'All',
      searchQuery: '',
      priceRange: 1000,
      categories,
      selectedSize: 'All',
      selectedSizeKids: 'All',
      sortBy: 'featured'
    });
  }
});

// Hospitality Packages: Show only events as products
router.get('/store/hospitality', async (req, res) => {
  try {
    // Fetch all unique categories for sidebar/chips (for UI consistency)
    const [catResults] = await connection.promise().query('SELECT DISTINCT category FROM gear WHERE category IS NOT NULL AND category != ""');
    const categories = catResults.map(row => row.category).filter(Boolean);

    // Fetch events from the events table (assuming table name is 'events')
    const [eventResults] = await connection.promise().query('SELECT * FROM events');
    // Map events to product-like objects for the store grid
    const products = eventResults.map(event => ({
      id: event.event_id,
      name: event.event_name,
      image: event.event_image || 'news.png', // fallback image
      price: Number(event.price || event.ticket_price || 0).toFixed(2),
      category: 'Hospitality'
    }));

    ensuregear_cartSession(req);
    res.render('store', {
      products,
      mostPopular: null,
      gear_cart: req.session.gear_cart,
      cart: req.session.gear_cart || [],
      selectedCategory: 'Hospitality',
      searchQuery: '',
      priceRange: 300,
      categories,
      selectedSize: 'All',
      selectedSizeKids: 'All',
      sortBy: 'featured',
      isHospitality: true // for UI logic if needed
    });
  } catch (err) {
    console.error('Error fetching hospitality packages:', err);
    res.render('store', {
      products: [],
      mostPopular: null,
      gear_cart: req.session.gear_cart,
      cart: req.session.gear_cart || [],
      selectedCategory: 'Hospitality',
      searchQuery: '',
      priceRange: 300,
      categories: [],
      selectedSize: 'All',
      selectedSizeKids: 'All',
      sortBy: 'featured',
      isHospitality: true
    });
  }
});

// Add item to gear_cart
router.post('/gear_cart/add/:id', async (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const quantity = parseInt(req.body.quantity, 10) || 1;
  const size = req.body.size || null;
  if (isNaN(gearId)) return res.status(400).send('Invalid gear ID');

  try {
    const [results] = await connection.promise().query('SELECT * FROM gear WHERE gear_id = ?', [gearId]);
    if (results.length === 0) return res.status(404).send('Item not found');

    const item = {
      ...results[0],
      price_per_unit: Number(results[0].price_per_unit),
      size: size
    };

    ensuregear_cartSession(req);
    const gear_cart = req.session.gear_cart;
    const existingItem = gear_cart.find((c) => c.gear_id === gearId && c.size === size);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      gear_cart.push({ ...item, quantity });
    }

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      res.json({ success: true });
    } else {
      res.redirect('/store?success=true');
    }
  } catch (err) {
    console.error('Error adding to gear_cart:', err);
    res.status(500).send('Database error');
  }
});

// View gear gear_cart
router.get('/gear_cart', (req, res) => {
  let isMember = false;
  if (req.session.user && req.session.user.role === 'member') {
    isMember = true;
  }
  res.render('gear_cart', { 
    gear_cart: req.session.gear_cart || [],
    cart: req.session.gear_cart || [],
    isMember,
    user: req.session.user 
  });
});

// Update gear_cart item quantity
router.post('/gear_cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQty = parseInt(req.body.quantity, 10);
  const size = req.body.size || null;
  ensuregear_cartSession(req);
  const item = req.session.gear_cart.find(i => i.gear_id === gearId && i.size === size);
  if (item && newQty > 0) {
    item.quantity = newQty;
  }
  res.redirect('/gear_cart');
});

// Remove item from gear_cart
router.post('/gear_cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const size = req.body.size || null;
  ensuregear_cartSession(req);
  req.session.gear_cart = req.session.gear_cart.filter(i => !(i.gear_id === gearId && i.size === size));
  res.redirect('/gear_cart');
});

// Thank you page
router.get('/thankyou', async (req, res) => {
  const orderId = req.query.order_id;
  if (!orderId) return res.redirect('/');

  try {
    const [orderResults] = await connection.promise().query(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );
    const order = orderResults[0];

    if (!order) return res.redirect('/');

    res.render('thankyou', { order });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).send('Database error');
  }
});

// View gear_cart summary (AJAX for sidebar)
router.get('/gear_cart/summary', (req, res) => {
  ensuregear_cartSession(req);
  // Only send minimal info for summary
  const summary = (req.session.gear_cart || []).map(item => ({
    name: item.gear_name || item.name,
    quantity: item.quantity,
    size: item.size
  }));
  res.json(summary);
});

module.exports = router;