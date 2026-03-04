/**
 * token.js - JWT (JSON Web Token) Helpers
 * ----------------------------------------
 * EN: Creates and verifies JWTs for store owner sessions (IS498: SO-002 Login, session created).
 *     generateToken: after login/register we create a signed token with store_owner_id, 7-day expiry.
 *     verifyToken: on protected routes we verify the token and get store_owner_id back.
 * AR: إنشاء والتحقق من رموز JWT لجلسات التاجر (تسجيل الدخول، إنشاء الجلسة).
 *     generateToken: بعد تسجيل الدخول/التسجيل ننشئ رمزاً موقعاً فيه store_owner_id، صلاحية 7 أيام.
 *     verifyToken: في المسارات المحمية نتحقق من الرمز ونستخرج store_owner_id.
 */

// EN: Import the jsonwebtoken library to sign and verify JWTs.
// AR: استيراد مكتبة jsonwebtoken لتوقيع والتحقق من رموز JWT.
const jwt = require('jsonwebtoken');

// EN: Secret key used to sign and verify tokens. Must be set in .env (JWT_SECRET) in production.
// AR: المفتاح السري لتوقيع والتحقق من الرموز. يُفضّل تعيينه في .env (JWT_SECRET) في الإنتاج.
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// EN: Token validity period; '7d' = 7 days. After that the user must log in again.
// AR: مدة صلاحية الرمز؛ '7d' = 7 أيام. بعدها يجب على المستخدم تسجيل الدخول مرة أخرى.
const EXPIRES_IN = '7d';

/**
 * EN: Create a new JWT containing the store owner's ID. Used after successful login or registration.
 * AR: إنشاء JWT جديد يحتوي على معرف صاحب المتجر. يُستخدم بعد تسجيل الدخول أو التسجيل بنجاح.
 */
function generateToken(storeOwnerId) {
  return jwt.sign(
    // EN: Payload: data stored inside the token. We only put store_owner_id (minimal, secure).
    // AR: الحمولة: البيانات داخل الرمز. نضع فقط store_owner_id (أقل قدر ممكن، آمن).
    { store_owner_id: storeOwnerId },
    // EN: Secret used to sign the token; only the server knowing this can create valid tokens.
    // AR: المفتاح السري لتوقيع الرمز؛ فقط الخادم الذي يعرف هذا المفتاح يستطيع إنشاء رموز صالحة.
    JWT_SECRET,
    // EN: Options: expiresIn makes the token automatically invalid after 7 days.
    // AR: الخيارات: expiresIn يجعل الرمز غير صالح تلقائياً بعد 7 أيام.
    { expiresIn: EXPIRES_IN }
  );
}

/**
 * EN: Verify that the token is valid (correct signature, not expired) and return the decoded payload.
 * AR: التحقق من أن الرمز صالح (توقيع صحيح، لم ينتهِ) وإرجاع البيانات المفكوكة.
 */
function verifyToken(token) {
  // EN: jwt.verify() decodes the token and checks the signature with JWT_SECRET; throws if invalid/expired.
  // AR: jwt.verify() يفك الرمز ويتحقق من التوقيع بـ JWT_SECRET؛ يرمي خطأ إذا كان غير صالح أو منتهيًا.
  return jwt.verify(token, JWT_SECRET);
}

// EN: Export both functions so routes (storeOwnersAuth) and middleware (authMiddleware) can use them.
// AR: تصدير الدالتين لاستخدامهما في المسارات (storeOwnersAuth) والوسيط (authMiddleware).
module.exports = {
  generateToken,
  verifyToken,
};
