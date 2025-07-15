// Middleware function to check user authentication status
const isAuthenticated = (req, res, next) => {
    console.log('isAuthenticated middleware HIT');
    console.log('Request path:', req.path);
    console.log('Session:', req.session);
    console.log('User:', req.session ? req.session.user : undefined);
    console.log('Session ID:', req.sessionID);
    if (req.session && req.session.user) {
        return next();
    }
    if (req.path.includes('/bookmarks')) {
        return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    res.redirect('/news');
};

module.exports = { isAuthenticated };