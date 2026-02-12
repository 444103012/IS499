const { verifyToken } = require('../utils/token');

/**
 * Validates JWT from Authorization header: "Bearer <token>"
 * Attaches store_owner_id to req.user
 * Returns 401 if missing or invalid.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid. Use: Bearer <token>' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = verifyToken(token);
    req.user = { store_owner_id: decoded.store_owner_id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
