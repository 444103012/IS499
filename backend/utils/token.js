const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const EXPIRES_IN = '7d';

function generateToken(storeOwnerId) {
  return jwt.sign(
    { store_owner_id: storeOwnerId },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};
