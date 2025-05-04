const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  membershipTier: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold'),
    defaultValue: 'bronze'
  },
  cashbackBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  cashbackExpiryDate: {
    type: DataTypes.DATE
  },
  phoneNumber: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  joinDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastLoginDate: {
    type: DataTypes.DATE
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to validate password
User.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Method to get discount rate based on membership tier
User.prototype.getDiscountRate = function() {
  const rates = {
    bronze: 0.05,  // 5% discount
    silver: 0.10,  // 10% discount
    gold: 0.15     // 15% discount
  };
  return rates[this.membershipTier];
};

// Method to get cashback rate based on membership tier
User.prototype.getCashbackRate = function() {
  const rates = {
    bronze: 0.01,  // 1% cashback
    silver: 0.02,  // 2% cashback
    gold: 0.03     // 3% cashback
  };
  return rates[this.membershipTier];
};

module.exports = User; 