const { verifyAdminToken } = require('../utils/generateToken');
function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid. Use: Bearer <token>' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = verifyAdminToken(token);
    req.user = { admin_id: decoded.admin_id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}
module.exports = adminAuthMiddleware;