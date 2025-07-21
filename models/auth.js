// Middleware function to check user authentication status
function isAuthenticated(req, res, next) {
  if (req.session && req.session.loggedIn && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Authentication required' });
}

// Middleware function to check admin status
function isAdmin(req, res, next) {
  if (
    req.session &&
    req.session.loggedIn &&
    req.session.user &&
    req.session.user.role === 'admin'
  ) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Admin access required' });
}

module.exports = { isAuthenticated, isAdmin };