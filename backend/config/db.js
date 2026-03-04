/**
 * db.js - Database Connection Pool
 * ---------------------------------
 * EN: Creates a PostgreSQL connection pool. StoreLaunch stores store owners, stores, products,
 *     orders, etc. (IS498 ER diagram). Pool allows multiple queries to reuse connections safely.
 * AR: إنشاء مجموعة اتصالات PostgreSQL. StoreLaunch يخزن أصحاب المتاجر والمتاجر والمنتجات
 *     والطلبات (مخطط ER في IS498). المجموعة تسمح بإعادة استخدام الاتصالات بأمان.
 */

// EN: Import the Pool class from the 'pg' library (PostgreSQL client for Node.js).
// AR: استيراد الصنف Pool من مكتبة 'pg' (عميل PostgreSQL لـ Node.js).
const { Pool } = require('pg');
// EN: Load environment variables from .env file into process.env (e.g. PG_USER, DATABASE_URL).
// AR: تحميل متغيرات البيئة من ملف .env إلى process.env (مثل PG_USER، DATABASE_URL).
require('dotenv').config();

// EN: Create one pool for the whole app. We use either DATABASE_URL (one string) or separate PG_* variables.
// AR: إنشاء مجموعة اتصال واحدة للتطبيق. نستخدم إما DATABASE_URL (سلسلة واحدة) أو متغيرات PG_*.
// EN: SSL required for AWS RDS and similar; use PG_SSL=true in .env.
// AR: SSL مطلوب لـ AWS RDS؛ استخدم PG_SSL=true في .env.
const useSSL = process.env.PG_SSL === 'true' || process.env.PG_SSL === '1';

const pool = new Pool(
  // EN: If DATABASE_URL is set (e.g. in production/Heroku), use it as the full connection string.
  // AR: إذا وُجد DATABASE_URL (مثلًا في الإنتاج) نستخدمه كسلسلة اتصال كاملة.
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        // EN: Otherwise use individual settings: database user name (e.g. postgres).
        // AR: وإلا نستخدم إعدادات منفصلة: اسم مستخدم قاعدة البيانات (مثل postgres).
        user: process.env.PG_USER,
        // EN: Host where PostgreSQL runs; default 'localhost' for local development.
        // AR: المضيف الذي يعمل عليه PostgreSQL؛ الافتراضي 'localhost' للتطوير المحلي.
        host: process.env.PG_HOST || 'localhost',
        // EN: Name of the database (e.g. storelaunch_db).
        // AR: اسم قاعدة البيانات (مثل storelaunch_db).
        database: process.env.PG_DATABASE,
        // EN: Password for the database user (keep in .env, never commit to git).
        // AR: كلمة مرور مستخدم قاعدة البيانات (في .env فقط، لا تُرفع إلى git).
        password: process.env.PG_PASSWORD,
        // EN: Port number; PostgreSQL default is 5432. parseInt(..., 10) ensures it's a number.
        // AR: رقم المنفذ؛ الافتراضي لـ PostgreSQL هو 5432. parseInt لتحويله لرقم.
        port: parseInt(process.env.PG_PORT, 10) || 5432,
        // EN: SSL for RDS/cloud; rejectUnauthorized: false for self-signed certs if needed.
        // AR: SSL لـ RDS والسحابة؛ rejectUnauthorized: false للشهادات الذاتية إن لزم.
        ...(useSSL && { ssl: { rejectUnauthorized: false } }),
      }
);

// EN: Export the pool so server.js can do: app.locals.pool = pool; and routes use req.app.locals.pool.
// AR: تصدير المجموعة ليستخدمها server.js والمسارات عبر req.app.locals.pool.
module.exports = pool;
