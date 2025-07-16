// Middleware function to check user authentication status
function isAuthenticated(req, res, next) {
  if (req.session && req.session.loggedIn && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Authentication required' });
}
module.exports = { isAuthenticated };