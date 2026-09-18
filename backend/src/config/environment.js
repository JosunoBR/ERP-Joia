const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'joiaerp_default_dev_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '12h',
  ROOT_PASSWORD: process.env.ROOT_PASSWORD || 'JoiaERP@Root2026'
};
