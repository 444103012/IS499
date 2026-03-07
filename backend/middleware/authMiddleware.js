const { verifyToken } = require('../utils/token');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid. Use: Bearer <token>' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    req.user = { store_owner_id: decoded.store_owner_id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
