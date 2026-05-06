require('dotenv').config();
const app = require('./app');
const { appReady } = app;
const PORT = process.env.PORT || 5000;

async function start() {
  await appReady;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Store Owner routes: POST /api/store-owners/register, /login');
    console.log('Customer routes: POST /api/customers/register, /login, /logout');
    console.log('Admin routes: POST /api/admin/auth/login, /logout, GET /api/admin/auth/me');
    console.log('Browse products routes: GET /api/products, /api/products/:id, /api/products/categories/list');
    console.log('Store setup routes: GET/POST /api/store-setup/status, /store-details, /select-plan, /select-theme, /payment, /shipping, /finish');
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
