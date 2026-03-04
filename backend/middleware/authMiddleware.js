/**
 * authMiddleware.js - JWT Authentication Middleware
 * -------------------------------------------------
 * EN: Protects routes that require a logged-in store owner (IS498: SO-002 Login, session).
 *     Client must send header: Authorization: Bearer <jwt>. We verify the token, attach
 *     store_owner_id to req.user, then call next(). Otherwise we respond 401.
 * AR: وسيط التحقق من هوية التاجر. يحمي المسارات التي تتطلب تسجيل دخول (تسجيل دخول التاجر).
 *     العميل يرسل: Authorization: Bearer <jwt>. نتحقق من الرمز ونربط store_owner_id بـ req.user.
 */

// EN: Import the token utility so we can verify the JWT signature and expiration.
// AR: استيراد دالة التحقق من الرمز (JWT) للتحقق من التوقيع وانتهاء الصلاحية.
const { verifyToken } = require('../utils/token');

/**
 * EN: Middleware function. Express calls it as (req, res, next) for every request to protected routes.
 * AR: دالة الوسيط. Express تستدعيها لكل طلب يصل لمسارات محمية.
 */
function authMiddleware(req, res, next) {
  // EN: Read the Authorization header from the incoming HTTP request (e.g. "Bearer eyJhbG...").
  // AR: قراءة رأس الطلب Authorization من الطلب القادم (مثال: "Bearer eyJhbG...").
  const authHeader = req.headers.authorization;

  // EN: If there is no header or it doesn't start with "Bearer ", the request is unauthorized.
  // AR: إذا لم يُرسل الرأس أو لم يبدأ بـ "Bearer " فالطلب غير مصرح.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid. Use: Bearer <token>' });
  }

  // EN: Remove the first 7 characters ("Bearer ") to get only the JWT string.
  // AR: إزالة أول 7 أحرف ("Bearer ") لاستخراج نص الرمز JWT فقط.
  const token = authHeader.slice(7);

  try {
    // EN: Verify the token: check signature with JWT_SECRET and that it hasn't expired. Throws if invalid.
    // AR: التحقق من الرمز: التحقق من التوقيع بـ JWT_SECRET وأنه لم ينتهِ. يرمي خطأ إذا كان غير صالح.
    const decoded = verifyToken(token);
    // EN: Attach the decoded payload to req.user so the route handler can use store_owner_id.
    // AR: ربط البيانات المفكوكة (مثل store_owner_id) بـ req.user لاستخدامها في معالج المسار.
    req.user = { store_owner_id: decoded.store_owner_id };
    // EN: Call next() to pass control to the next middleware or the route handler.
    // AR: استدعاء next() لتمرير التحكم للوسيط التالي أو معالج المسار.
    next();
  } catch (err) {
    // EN: If verification fails (wrong signature or expired), respond with 401 Unauthorized.
    // AR: إذا فشل التحقق (توقيع خاطئ أو منتهي الصلاحية) نُرجع 401 غير مصرح.
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// EN: Export the middleware so server.js can use it: app.get('/api/store-owners/me', authMiddleware, ...).
// AR: تصدير الوسيط لاستخدامه في server.js لحماية المسارات.
module.exports = authMiddleware;
