const crypto = require('crypto');

/**
 * Hash password with SHA-256 (hex).
 * @param {string} password - Plain text password
 * @returns {string} - 64-char hex hash
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
}

module.exports = { hashPassword };
