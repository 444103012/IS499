/**
 * hash.js - Password Hashing Utilities
 * ------------------------------------
 * EN: IS498 Non-Functional Requirements: "Password Hashing - StoreLaunch securely stores user
 *     passwords using hashing algorithms." We never store plain text; we hash on register and
 *     compare on login using bcrypt.
 * AR: متطلبات IS498 غير الوظيفية: "تخزين كلمات المرور بشكل آمن باستخدام خوارزميات التجزئة."
 *     لا نخزن النص العادي أبداً؛ نجزّئ عند التسجيل ونقارن عند تسجيل الدخول باستخدام bcrypt.
 */

// EN: Import bcrypt library: industry-standard for secure password hashing (salt + hash).
// AR: استيراد مكتبة bcrypt: معيار آمن لتجزئة كلمات المرور (ملح + تجزئة).
const bcrypt = require('bcrypt');

// EN: Number of salt rounds; higher = more secure but slower. 10 is a good balance (IS498 security).
// AR: عدد جولات الملح؛ كلما زادت زاد الأمان ولكن البطء. 10 توازن جيد (أمان حسب IS498).
const SALT_ROUNDS = 10;

/**
 * EN: Hash a plain text password before saving to database. Used in store owner registration (SO-001).
 * AR: تجزئة كلمة المرور النصية قبل الحفظ في قاعدة البيانات. تُستخدم في تسجيل التاجر (SO-001).
 */
async function hashPassword(plainPassword) {
  // EN: bcrypt.hash() generates a random salt, hashes the password with it, returns the full hash string.
  // AR: bcrypt.hash() يولّد ملحاً عشوائياً، يجزّئ كلمة المرور معه، ويرجع سلسلة التجزئة الكاملة.
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * EN: Compare the password entered at login with the hash stored in the database (SO-002 Login).
 * AR: مقارنة كلمة المرور المدخلة عند تسجيل الدخول مع التجزئة المخزنة في قاعدة البيانات (تسجيل الدخول).
 */
async function comparePassword(plainPassword, hashedPassword) {
  // EN: bcrypt.compare() securely checks if plainPassword matches the hash (constant-time, safe).
  // AR: bcrypt.compare() يتحقق بأمان من تطابق كلمة المرور مع التجزئة (وقت ثابت، آمن).
  return bcrypt.compare(plainPassword, hashedPassword);
}

// EN: Export so storeOwnersAuth routes can call hashPassword on register and comparePassword on login.
// AR: تصدير لاستدعاء hashPassword عند التسجيل و comparePassword عند تسجيل الدخول في المسارات.
module.exports = {
  hashPassword,
  comparePassword,
};
