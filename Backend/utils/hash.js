const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt.
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} Resolves with the hashed password
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a stored hash.
 * @param {string} plainPassword - Plain text password from request
 * @param {string} hashedPassword - Stored password_hash from database
 * @returns {Promise<boolean>} Resolves with true if match, false otherwise
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
};
