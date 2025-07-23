//for admin password hashing 
const bcrypt = require('bcrypt');

const plainPassword = 'admin123'; //  raw password
const saltRounds = 12;

bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
  if (err) throw err;
  console.log('Hashed password:', hash);
});
