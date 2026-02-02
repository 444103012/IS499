import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'storelaunch.db');

let _db = null;

function createWrapper(db) {
  return {
    exec(sql) {
      return db.exec(sql);
    },
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        run(...params) {
          stmt.bind(params);
          stmt.step();
          stmt.free();
        },
        get(...params) {
          stmt.bind(params);
          const row = stmt.step() ? stmt.getAsObject() : null;
          stmt.free();
          return row;
        },
        all(...params) {
          stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        },
      };
    },
  };
}

export const db = {
  exec(sql) {
    if (!_db) throw new Error('DB not initialized');
    return _db.exec(sql);
  },
  prepare(sql) {
    if (!_db) throw new Error('DB not initialized');
    const stmt = _db.prepare(sql);
    return {
      run(...params) {
        stmt.bind(params);
        stmt.step();
        stmt.free();
      },
      get(...params) {
        stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return row;
      },
      all(...params) {
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
    };
  },
};

export async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','store_owner','customer')),
      full_name TEXT,
      preferred_language TEXT DEFAULT 'en',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      logo_url TEXT,
      theme TEXT DEFAULT 'default',
      theme_colors TEXT,
      custom_domain TEXT,
      subscription_plan TEXT DEFAULT 'basic',
      is_active INTEGER DEFAULT 1,
      is_suspended INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      name_ar TEXT,
      name_en TEXT NOT NULL,
      parent_id TEXT REFERENCES categories(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      category_id TEXT REFERENCES categories(id),
      name_ar TEXT,
      name_en TEXT NOT NULL,
      description_ar TEXT,
      description_en TEXT,
      price REAL NOT NULL,
      compare_at_price REAL,
      sku TEXT,
      stock_quantity INTEGER DEFAULT 0,
      image_url TEXT,
      images TEXT,
      options TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      customer_id TEXT REFERENCES users(id),
      guest_email TEXT,
      guest_name TEXT,
      status TEXT DEFAULT 'pending',
      subtotal REAL NOT NULL,
      shipping_cost REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL NOT NULL,
      currency TEXT DEFAULT 'SAR',
      shipping_address TEXT,
      shipping_method TEXT,
      tracking_number TEXT,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      options TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      customer_id TEXT REFERENCES users(id),
      session_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL REFERENCES carts(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      options TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      provider TEXT NOT NULL,
      credentials TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shipping_options (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      name TEXT NOT NULL,
      regions TEXT,
      price REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_monthly REAL DEFAULT 0,
      features TEXT,
      max_products INTEGER,
      custom_domain INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_subscriptions (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id),
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      status TEXT DEFAULT 'active',
      current_period_end TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      order_id TEXT REFERENCES orders(id),
      customer_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
    CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_carts_store_session ON carts(store_id, session_id);
  `);

  const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const hash = await bcrypt.hash('Admin@123', 10);
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)'
    ).run(randomUUID(), 'admin@storelaunch.sa', hash, 'admin', 'Platform Admin');
  }

  const plansExist = db.prepare('SELECT id FROM subscription_plans LIMIT 1').get();
  if (!plansExist) {
    db.prepare(
      `INSERT INTO subscription_plans (id, name, price_monthly, max_products, custom_domain) VALUES 
       ('basic', 'Basic', 0, 50, 0),
       ('pro', 'Pro', 69, 500, 0),
       ('advanced', 'Advanced', 199, -1, 1)`
    ).run();
  }

  try {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    // ignore persist errors
  }
}
