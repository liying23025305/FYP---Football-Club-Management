exports.shopHome = (req, res) => {
  res.render('pages/shop', {
    title: 'Shop',
    user: req.user
  });
};

exports.productDetail = (req, res) => {
  // Placeholder product detail
  res.render('pages/product_detail', {
    title: 'Product Detail',
    user: req.user,
    productId: req.params.id
  });
};

exports.cartPage = (req, res) => {
  res.render('pages/cart', {
    title: 'Your Cart',
    user: req.user
  });
}; 