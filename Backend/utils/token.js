const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const EXPIRES_IN = '7d';

/**
 * Generate a JWT for a store owner.
 * Payload: { store_owner_id }
 * Expiration: 7 days
 * @param {number} storeOwnerId - store_owner_id from database
 * @returns {string} Signed JWT
 */
function generateToken(storeOwnerId) {
  return jwt.sign(
    { store_owner_id: storeOwnerId },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT.
 * @param {string} token - JWT string
 * @returns {object} Decoded payload (e.g. { store_owner_id })
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};
