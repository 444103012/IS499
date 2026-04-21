const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const EXPIRES_IN = '7d';
function generateAdminToken(adminId) {
  return jwt.sign(
    { admin_id: adminId, role: 'admin' },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}
function verifyAdminToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.role !== 'admin' || decoded.admin_id == null) {
    throw new Error('Invalid admin token');
  }
  return decoded;
}
module.exports = {
  generateAdminToken,
  verifyAdminToken,
};