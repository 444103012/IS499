# StoreLaunch

pull

E-commerce platform for Saudi SMBs — IS498 Graduation Project, King Saud University.  
Supervised by Dr. Abdulrahman Alothaim.

## Features

- **Store Owners**: Register, create store, add products, manage orders, subscription plans, store settings, reports.
- **Customers**: Browse store by slug, cart, checkout, order history, track order, profile, Arabic/English.
- **Admins**: User management, moderate stores (suspend/restore), platform stats, audit.

## Tech Stack

- **Backend**: Node.js, Express, SQLite (sql.js — no native build), JWT auth, bcrypt.
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, i18next (Arabic/English, RTL).

## Quick Start

### 1. Install dependencies

```bash
cd StoreLaunch
npm install
cd client
npm install
```

### 2. Run backend

From project root `StoreLaunch`:

```bash
npm run server
```

API runs at **http://localhost:5000**.

### 3. Run frontend

From project root:

```bash
cd client
npm run dev
```

App runs at **http://localhost:3000** (proxies `/api` to backend).

### 4. Default admin

- **Email**: `admin@storelaunch.sa`  
- **Password**: `Admin@123`

## Project Structure

```
StoreLaunch/
├── server/
│   ├── index.js          # Express app
│   ├── db/init.js        # SQLite schema + seed
│   ├── middleware/auth.js
│   └── routes/           # auth, stores, products, orders, cart, admin, subscriptions
├── client/
│   ├── src/
│   │   ├── App.jsx, main.jsx
│   │   ├── i18n.js       # Arabic/English
│   │   ├── context/AuthContext.jsx
│   │   ├── api.js
│   │   ├── components/Layout.jsx
│   │   └── pages/        # Home, Login, Register, Dashboard, Storefront, Cart, Checkout, Admin, etc.
│   └── index.html
├── package.json
└── README.md
```

## Main flows

1. **Store owner**: Register (role: Store Owner) → Dashboard → Products / Orders / Settings / Subscription. Share store URL: `/store/<slug>`.
2. **Customer**: Register or Login → Open `/store/<slug>` → Add to cart → Checkout → Order history; optional language switch (AR/EN).
3. **Admin**: Login with admin account → Admin dashboard → Users, Stores (suspend/restore), Stats.

## API overview

| Area        | Endpoints |
|------------|-----------|
| Auth        | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me` |
| Stores      | `GET /api/stores/public/:slug`, `GET /api/stores/my`, `GET/PUT /api/stores/:id` |
| Products    | `GET /api/products/store/:storeId`, `GET /api/products/:id`, `GET/POST /api/products/manage/:storeId`, `PUT/DELETE /api/products/:id` |
| Orders      | `GET /api/orders/my`, `GET /api/orders/my/:id`, `POST /api/orders/my/:id/confirm-payment`, `GET/PATCH /api/orders/store/:storeId/...` |
| Cart        | `GET /api/cart/:storeId`, `POST /api/cart/:storeId/items`, `PATCH /api/cart/:storeId/items/:itemId`, `POST /api/cart/:storeId/checkout` |
| Subscriptions | `GET /api/subscriptions/plans`, `GET /api/subscriptions/store/:storeId`, `POST /api/subscriptions/store/:storeId` |
| Admin       | `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/stores`, `PATCH /api/admin/stores/:id/suspend`, `GET /api/admin/stats` |

## References

- IS498-Alothaim.pdf (project specification)
- King Saud University, College of Computer Science & Information, Department of Information Systems
