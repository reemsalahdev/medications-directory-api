const User = require('../models/User');
const logger = require('./logger');

const createDefaultAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: process.env.ADMIN_EMAIL || 'admin@medications.com' 
    });

    if (existingAdmin) {
      logger.info('Default admin user already exists');
      return;
    }

    // Create default admin user
    const adminUser = new User({
      email: process.env.ADMIN_EMAIL || 'admin@medications.com',
      password: process.env.ADMIN_PASSWORD || 'change-me',
      role: 'admin'
    });

    await adminUser.save();
    logger.info(`Default admin user created: ${adminUser.email}`);
    logger.info('Please change the default password after first login');

  } catch (error) {
    logger.error('Error creating default admin user:', error);
  }
};

module.exports = createDefaultAdmin;