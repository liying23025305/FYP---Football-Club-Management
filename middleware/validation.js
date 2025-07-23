
const { body } = require('express-validator');
const { getConnection } = require('../models/db'); // Adjust path as needed
async function checkExpiredMemberships() {
  try {
    const db = getConnection();
    await db.execute(`
      UPDATE user_memberships 
      SET status = 'expired' 
      WHERE status = 'active' AND expiry_date < CURDATE()
    `);
  } catch (error) {
    console.error('Error checking expired memberships:', error);
  }
}

const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('username')
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8, max: 20 })
    .withMessage('Password must be 8-20 characters long'),
  body('first_name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be under 100 characters'),
  body('surname')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Surname is required and must be under 100 characters'),
  body('dob')
    .isDate()
    .withMessage('Please enter a valid date of birth'),
  body('country')
    .notEmpty()
    .withMessage('Country is required'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please enter a valid phone number')
];

// Membership tier validation
const validateMembershipTier = [
  body('tier_name')
    .notEmpty()
    .trim()
    .withMessage('Tier name is required'),
  body('tier_desc')
    .optional()
    .trim(),
  body('discount_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount percentage must be between 0 and 100'),
  body('cashback_rate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Cashback rate must be between 0 and 100'),
  body('duration_months')
    .isInt({ min: 1, max: 120 })
    .withMessage('Duration must be between 1 and 120 months'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a valid amount')
];

// Utility functions
function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function validatePassword(password, username, email) {
  const errors = [];
  
  if (password.length < 8 || password.length > 20) {
    errors.push('Password must be between 8 and 20 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  if (password.toLowerCase().includes(username.toLowerCase())) {
    errors.push('Password cannot contain your username');
  }
  
  if (password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
    errors.push('Password cannot contain your email');
  }
  
  return errors;
}

module.exports = { validateRegistration, validateMembershipTier,calculateAge,validatePassword,checkExpiredMemberships };