/**
 * server.js - Backend Entry Point (StoreLaunch API Server)
 * --------------------------------------------------------
 * EN: Starts the Express server. Implements part of IS498: store owner registration (SO-001),
 *     login (SO-002), session (JWT), and a protected route example. Frontend (React) calls
 *     this API; we use CORS, JSON body parsing, and a shared database pool.
 * AR: نقطة دخول الخادم. ينفذ جزءاً من IS498: تسجيل التاجر (SO-001)، تسجيل الدخول (SO-002)،
 *     الجلسة (JWT)، ومسار محمي كمثال. الواجهة الأمامية (React) تستدعي هذا API؛ نستخدم CORS
 *     وتحليل JSON ومجموعة اتصال قاعدة البيانات.
 */

// EN: Load .env into process.env so we can use PORT, JWT_SECRET, DATABASE_URL, etc.
// AR: تحميل .env إلى process.env لاستخدام PORT و JWT_SECRET و DATABASE_URL وغيرها.
require('dotenv').config();
// EN: Express is the web framework: we define routes and middleware here.
// AR: Express إطار عمل الويب: نعرّف المسارات والوسائط هنا.
const express = require('express');
// EN: CORS lets the React app (different origin, e.g. localhost:3000) call this API without browser blocking.
// AR: CORS يسمح لتطبيق React (مصدر مختلف، مثل localhost:3000) باستدعاء هذا API دون حظر المتصفح.
const cors = require('cors');
// EN: Database connection pool; we attach it to app so routes can run SQL queries.
// AR: مجموعة اتصال قاعدة البيانات؛ نربطها بالتطبيق لتنفيذ استعلامات SQL في المسارات.
const pool = require('./config/db');
// EN: Router that defines POST /register and POST /login for store owners (IS498 SO-001, SO-002).
// AR: المسارات التي تعرّف POST /register و POST /login لأصحاب المتاجر (IS498 SO-001, SO-002).
const storeOwnersAuthRouter = require('./routes/storeOwnersAuth');
// EN: Middleware that checks JWT on protected routes and sets req.user (store_owner_id).
// AR: وسيط يتحقق من JWT في المسارات المحمية ويضع req.user (store_owner_id).
const authMiddleware = require('./middleware/authMiddleware');

// EN: Create the Express application instance.
// AR: إنشاء نسخة تطبيق Express.
const app = express();
// EN: Port to listen on; from env or default 5000 (React usually runs on 3000).
// AR: المنفذ للاستماع؛ من البيئة أو الافتراضي 5000 (React عادة على 3000).
const PORT = process.env.PORT || 5000;

// EN: Allow requests from frontend origin(s). Without this, browser would block cross-origin API calls.
// AR: السماح بطلبات من مصدر الواجهة الأمامية. بدونه يحظر المتصفح طلبات API cross-origin.
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://127.0.0.1:3000'],
  optionsSuccessStatus: 200,
}));
// EN: Parse JSON request bodies (e.g. { "email": "...", "password": "..." }) into req.body.
// AR: تحليل أجسام الطلبات JSON إلى req.body (مثل البريد وكلمة المرور).
app.use(express.json());

// EN: Store the pool in app.locals so every route can access it via req.app.locals.pool.
// AR: تخزين مجموعة الاتصال في app.locals لوصول كل مسار إليها عبر req.app.locals.pool.
app.locals.pool = pool;

// ----- EN: Store owners auth routes (public: no JWT required). AR: مسارات مصادقة أصحاب المتاجر (عامة) -----
app.use('/api/store-owners', storeOwnersAuthRouter);

// EN: Protected route example: only requests with valid "Authorization: Bearer <token>" can access.
// AR: مثال لمسار محمي: فقط الطلبات ذات الرمز الصحيح في "Authorization: Bearer <token>" يمكنها الوصول.
app.get('/api/store-owners/me', authMiddleware, (req, res) => {
  // EN: authMiddleware already set req.user; we return it to confirm the authenticated owner.
  // AR: authMiddleware وضع بالفعل req.user؛ نرجعه لتأكيد التاجر المصادق.
  res.json({
    message: 'Authenticated',
    store_owner_id: req.user.store_owner_id,
  });
});

// EN: Health check: returns { status: 'ok' }. Used by load balancers or monitoring (IS498 availability).
// AR: فحص صحة الخادم: يرجع { status: 'ok' }. يُستخدم للمراقبة أو موازنات التحميل (توفر النظام).
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// EN: Start listening on PORT. When ready, log to console.
// AR: بدء الاستماع على المنفذ. عند الجاهزية، طباعة رسالة في الكونسول.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
