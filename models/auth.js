// Middleware function to check user authentication status
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        if (req.originalUrl === '/login' || req.originalUrl === '/register') {
            next();
        } else {
            res.redirect('/login');
        }
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. Admin rights required.',
            user: req.session.user 
        });
    }
};

// Middleware to check if user can access profile (own profile or admin)
const canAccessProfile = (req, res, next) => {
    const requestedUserId = req.params.id;
    const currentUser = req.session.user;
    
    if (!currentUser) {
        return res.redirect('/login');
    }
    
    // Admin can access any profile, user can only access their own
    if (currentUser.role === 'admin' || currentUser.user_id == requestedUserId) {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. You can only access your own profile.',
            user: req.session.user 
        });
    }
};

module.exports = { isAuthenticated, isAdmin, canAccessProfile };