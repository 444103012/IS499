const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const EXPIRES_IN = '7d';

function generateToken(userId, role = 'store_owner') {
  const payload = role === 'customer' 
    ? { customer_id: userId, role: 'customer' }
    : { store_owner_id: userId, role: 'store_owner' };
  
  return jwt.sign(
   
   
    payload,
   
   
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