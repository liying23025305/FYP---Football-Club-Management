exports.calendarHome = (req, res) => {
  res.render('pages/calendar', {
    title: 'Calendar',
    user: req.user
  });
}; 