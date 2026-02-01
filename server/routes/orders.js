import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();

function canAccessStore(storeId, user) {
  if (!user) return false;
  const store = db.prepare('SELECT owner_id FROM stores WHERE id = ?').get(storeId);
  return store && (store.owner_id === user.id || user.role === 'admin');
}

router.use(authMiddleware);

router.get('/my', (req, res) => {
  const orders = db.prepare(
    'SELECT o.*, s.name as store_name, s.slug as store_slug FROM orders o JOIN stores s ON o.store_id = s.id WHERE o.customer_id = ? ORDER BY o.created_at DESC'
  ).all(req.user.id);
  res.json(orders);
});

router.get('/my/:id', param('id').isUUID(), (req, res) => {
  const order = db.prepare(
    'SELECT o.*, s.name as store_name, s.slug as store_slug FROM orders o JOIN stores s ON o.store_id = s.id WHERE o.id = ? AND o.customer_id = ?'
  ).get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

router.post('/my/:id/confirm-payment', param('id').isUUID(), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND customer_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.payment_status === 'paid') return res.json(order);
  db.prepare('UPDATE orders SET payment_status = ?, status = ?, updated_at = datetime("now") WHERE id = ?').run('paid', 'confirmed', order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.get('/store/:storeId', requireRole('store_owner', 'admin'), (req, res) => {
  if (!canAccessStore(req.params.storeId, req.user)) return res.status(403).json({ error: 'Forbidden' });
  const orders = db.prepare(
    'SELECT o.*, u.full_name as customer_name, u.email as customer_email FROM orders o LEFT JOIN users u ON o.customer_id = u.id WHERE o.store_id = ? ORDER BY o.created_at DESC'
  ).all(req.params.storeId);
  res.json(orders);
});

router.get('/store/:storeId/:orderId', requireRole('store_owner', 'admin'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND store_id = ?').get(req.params.orderId, req.params.storeId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!canAccessStore(order.store_id, req.user)) return res.status(403).json({ error: 'Forbidden' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const customer = order.customer_id ? db.prepare('SELECT id, full_name, email, phone FROM users WHERE id = ?').get(order.customer_id) : null;
  res.json({ ...order, items, customer });
});

router.patch('/store/:storeId/:orderId',
  requireRole('store_owner', 'admin'),
  body('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
  body('trackingNumber').optional().trim(),
  (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND store_id = ?').get(req.params.orderId, req.params.storeId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!canAccessStore(order.store_id, req.user)) return res.status(403).json({ error: 'Forbidden' });
    const updates = [];
    const params = [];
    if (req.body.status !== undefined) { updates.push('status = ?'); params.push(req.body.status); }
    if (req.body.trackingNumber !== undefined) { updates.push('tracking_number = ?'); params.push(req.body.trackingNumber); }
    if (!updates.length) return res.json(order);
    params.push(req.params.orderId);
    db.prepare(`UPDATE orders SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);
    res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId));
  }
);

export default router;
