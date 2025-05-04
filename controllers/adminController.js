exports.dashboard = (req, res) => {
  res.render('pages/admin_dashboard', {
    title: 'Admin Dashboard',
    user: req.user
  });
}; 