const { verifyToken } = require('../utils/token');

function customerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'customer' || !decoded.customer_id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.customerId = decoded.customer_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = customerAuth;