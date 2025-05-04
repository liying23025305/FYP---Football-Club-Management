exports.paymentPage = (req, res) => {
  res.render('pages/payment', {
    title: 'Payments',
    user: req.user
  });
};

// Future: createStripeIntent 