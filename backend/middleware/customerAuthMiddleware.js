const { verifyToken } = require('../utils/token');
function customerAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid. Use: Bearer <token>' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'customer' || !decoded.customer_id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { customer_id: decoded.customer_id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
module.exports = customerAuthMiddleware;