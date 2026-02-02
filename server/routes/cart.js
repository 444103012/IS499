import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();

function getOrCreateCart(storeId, userId, sessionId) {
  let cart = userId
    ? db.prepare('SELECT * FROM carts WHERE store_id = ? AND customer_id = ?').get(storeId, userId)
    : sessionId
      ? db.prepare('SELECT * FROM carts WHERE store_id = ? AND session_id = ?').get(storeId, sessionId)
      : null;
  if (!cart) {
    const id = randomUUID();
    db.prepare('INSERT INTO carts (id, store_id, customer_id, session_id) VALUES (?, ?, ?, ?)').run(id, storeId, userId || null, sessionId || null);
    cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(id);
  }
  return cart;
}

router.get('/:storeId', optionalAuth, (req, res) => {
  const store = db.prepare('SELECT id FROM stores WHERE id = ? AND is_active = 1 AND is_suspended = 0').get(req.params.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  const cart = getOrCreateCart(req.params.storeId, req.user?.id, sessionId);
  const items = db.prepare(
    `SELECT ci.*, p.name_en, p.name_ar, p.price, p.image_url, p.stock_quantity FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ? AND p.is_active = 1`
  ).all(cart.id);
  let subtotal = 0;
  items.forEach(i => { subtotal += i.price * i.quantity; });
  res.json({ cart, items, subtotal });
});

router.post('/:storeId/items',
  authMiddleware,
  body('productId').isUUID(),
  body('quantity').isInt({ min: 1 }),
  body('options').optional(),
  (req, res) => {
    const store = db.prepare('SELECT id FROM stores WHERE id = ? AND is_active = 1 AND is_suspended = 0').get(req.params.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND store_id = ? AND is_active = 1').get(req.body.productId, req.params.storeId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock_quantity < req.body.quantity) return res.status(400).json({ error: 'Insufficient stock' });
    const cart = getOrCreateCart(req.params.storeId, req.user.id, null);
    let item = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?').get(cart.id, req.body.productId);
    if (item) {
      const newQty = item.quantity + req.body.quantity;
      if (product.stock_quantity < newQty) return res.status(400).json({ error: 'Insufficient stock' });
      db.prepare('UPDATE cart_items SET quantity = ?, options = ? WHERE id = ?').run(newQty, JSON.stringify(req.body.options || {}), item.id);
    } else {
      const id = randomUUID();
      db.prepare('INSERT INTO cart_items (id, cart_id, product_id, quantity, options) VALUES (?, ?, ?, ?, ?)').run(id, cart.id, req.body.productId, req.body.quantity, JSON.stringify(req.body.options || {}));
    }
    const items = db.prepare('SELECT ci.*, p.name_en, p.name_ar, p.price, p.image_url FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?').all(cart.id);
    res.json({ cart, items });
  }
);

router.patch('/:storeId/items/:itemId',
  authMiddleware,
  body('quantity').isInt({ min: 0 }),
  (req, res) => {
    const cart = db.prepare('SELECT * FROM carts WHERE store_id = ? AND customer_id = ?').get(req.params.storeId, req.user.id);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND cart_id = ?').get(req.params.itemId, cart.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (req.body.quantity === 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.itemId);
    } else {
      const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
      if (product.stock_quantity < req.body.quantity) return res.status(400).json({ error: 'Insufficient stock' });
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(req.body.quantity, req.params.itemId);
    }
    const items = db.prepare('SELECT ci.*, p.name_en, p.name_ar, p.price, p.image_url FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?').all(cart.id);
    res.json({ items });
  }
);

router.delete('/:storeId/items/:itemId', authMiddleware, (req, res) => {
  const cart = db.prepare('SELECT * FROM carts WHERE store_id = ? AND customer_id = ?').get(req.params.storeId, req.user.id);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });
  db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(req.params.itemId, cart.id);
  res.json({ message: 'Removed' });
});

router.post('/:storeId/checkout',
  authMiddleware,
  body('shippingAddress').trim().notEmpty(),
  body('shippingMethod').optional().trim(),
  body('guestName').optional().trim(),
  body('guestEmail').optional().isEmail(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const store = db.prepare('SELECT * FROM stores WHERE id = ? AND is_active = 1 AND is_suspended = 0').get(req.params.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const cart = db.prepare('SELECT * FROM carts WHERE store_id = ? AND customer_id = ?').get(req.params.storeId, req.user.id);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const items = db.prepare('SELECT ci.*, p.name_en, p.price, p.stock_quantity FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?').all(cart.id);
    if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
    let subtotal = 0;
    for (const i of items) {
      if (i.stock_quantity < i.quantity) return res.status(400).json({ error: `Insufficient stock for product` });
      subtotal += i.price * i.quantity;
    }
    const shippingCost = 0;
    const tax = 0;
    const total = subtotal + shippingCost + tax;
    const orderId = randomUUID();
    db.prepare(
      'INSERT INTO orders (id, store_id, customer_id, status, subtotal, shipping_cost, tax, total, shipping_address, shipping_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(orderId, store.id, req.user.id, 'pending', subtotal, shippingCost, tax, total, req.body.shippingAddress, req.body.shippingMethod || null, 'pending');
    for (const i of items) {
      db.prepare('INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, options) VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), orderId, i.product_id, i.name_en, i.quantity, i.price, i.options || '{}');
      db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(i.quantity, i.product_id);
    }
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    res.status(201).json({ order, items: orderItems });
  }
);

export default router;
