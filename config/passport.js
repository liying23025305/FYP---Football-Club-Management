const LocalStrategy = require('passport-local').Strategy;
// const User = require('../models/User'); // Uncomment and use your User model

module.exports = function(passport) {
  // Dummy user for demonstration
  const dummyUser = { id: 1, email: 'test@example.com', password: 'password', name: 'Test User' };

  passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Replace this with real DB lookup
    if (email === dummyUser.email && password === dummyUser.password) {
      return done(null, dummyUser);
    } else {
      return done(null, false, { message: 'Incorrect email or password.' });
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    // Replace with real DB lookup
    if (id === dummyUser.id) {
      done(null, dummyUser);
    } else {
      done(null, false);
    }
  });
}; 