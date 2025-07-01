const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

// Update credentials for XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // default for XAMPP
  database: 'mydb'
});

// Ensure session cart exists
function ensureCartSession(req) {
  if (!req.session.cart) {
    req.session.cart = [];
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
    ensureCartSession(req);
    res.render('store', {
      products,
      mostPopular,
      cart: req.session.cart,
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
      cart: req.session.cart,
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

    ensureCartSession(req);
    res.render('store', {
      products,
      mostPopular: null,
      cart: req.session.cart,
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
      cart: req.session.cart,
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

// Add item to cart
router.post('/cart/add/:id', async (req, res) => {
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

    ensureCartSession(req);
    const cart = req.session.cart;
    const existingItem = cart.find((c) => c.gear_id === gearId && c.size === size);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ ...item, quantity });
    }

    res.redirect('/store?success=true');
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).send('Database error');
  }
});

// View cart
router.get('/cart', (req, res) => {
  let isMember = false;
  if (req.session.user && req.session.user.role === 'member') {
    isMember = true;
  }
  res.render('cart', { cart: req.session.cart || [], isMember });
});

// Update cart item quantity
router.post('/cart/update/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const newQty = parseInt(req.body.quantity, 10);
  const size = req.body.size || null;
  ensureCartSession(req);
  const item = req.session.cart.find(i => i.gear_id === gearId && i.size === size);
  if (item && newQty > 0) {
    item.quantity = newQty;
  }
  res.redirect('/cart');
});

// Remove item from cart
router.post('/cart/remove/:id', (req, res) => {
  const gearId = parseInt(req.params.id, 10);
  const size = req.body.size || null;
  ensureCartSession(req);
  req.session.cart = req.session.cart.filter(i => !(i.gear_id === gearId && i.size === size));
  res.redirect('/cart');
});

// Checkout page
router.get('/payment', (req, res) => {
  const cart = req.session.cart || [];
  const customer = req.session.user;
  if (!customer) return res.redirect('/login');
  if (cart.length === 0) return res.redirect('/cart');

  connection.query('SELECT payment_method_id, method_name FROM payment_methods', (err, paymentModes) => {
    if (err) {
      console.error('DB error in /payment:', err);
      return res.status(500).send('Database error');
    }
    res.render('payment', { cart, customer, paymentModes });
  });
});

// Payment processing (form submit)
router.post('/payment/process', async (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const cart = req.session.cart || [];
  const user = req.session.user;
  if (!user || cart.length === 0) {
    return res.status(400).send('Missing user or cart data.');
  }

  const account_id = user.account_id;
  const user_id = user.user_id; // for payments/orders
  const shipping_address = user.address || '';

  try {
    // Find payment_method_id
    const [pmResults] = await connection.promise().query(
      'SELECT payment_method_id FROM payment_methods WHERE LOWER(method_name) = LOWER(?) LIMIT 1',
      [paymentMethod]
    );
    if (pmResults.length === 0) {
      return res.status(400).send('Payment method not found. Please select a valid payment method.');
    }
    const payment_method_id = pmResults[0].payment_method_id;

    // Calculate totals
    const total_amount = cart.reduce((sum, item) => sum + item.price_per_unit * item.quantity, 0);
    const discount_applied = 0.00; // Add logic if you have discounts
    const final_amount = total_amount - discount_applied;

    // Insert order
    const [orderResult] = await connection.promise().query(
      'INSERT INTO orders (order_date, total_amount, discount_applied, final_amount, status, shipping_address, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [new Date(), total_amount, discount_applied, final_amount, 'pending', shipping_address, user_id]
    );
    const order_id = orderResult.insertId;

    // Insert order_items and update gear inventory
    for (const item of cart) {
      await connection.promise().query(
        'INSERT INTO order_items (quantity, unit_price, total_price, order_id, gear_id) VALUES (?, ?, ?, ?, ?)',
        [item.quantity, item.price_per_unit, item.price_per_unit * item.quantity, order_id, item.gear_id]
      );
      // Optionally update inventory
      await connection.promise().query(
        'UPDATE gear SET gear_quantity = GREATEST(gear_quantity - ?, 0) WHERE gear_id = ?',
        [item.quantity, item.gear_id]
      );
    }

    // Insert payment record
    await connection.promise().query(
      'INSERT INTO payments (amount, payment_type, payment_status, transaction_reference, user_id, payment_method_id) VALUES (?, ?, ?, ?, ?, ?)',
      [final_amount, 'online', 'completed', `order-${order_id}`, user_id, payment_method_id]
    );

    // Clear cart on successful payment
    req.session.cart = [];

    res.redirect(`/thankyou?order_id=${order_id}`);
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).send('Payment processing error');
  }
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

// View cart summary (AJAX for sidebar)
router.get('/cart/summary', (req, res) => {
  ensureCartSession(req);
  // Only send minimal info for summary
  const summary = (req.session.cart || []).map(item => ({
    name: item.gear_name || item.name,
    quantity: item.quantity,
    size: item.size
  }));
  res.json(summary);
});

module.exports = router;