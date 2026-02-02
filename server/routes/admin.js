import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

function auditLog(userId, action, entityType, entityId, details) {
  db.prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(userId, action, entityType, entityId, details ? JSON.stringify(details) : null);
}

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, email, phone, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.patch('/users/:id',
  param('id').isUUID(),
  body('isActive').optional().isBoolean(),
  (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (req.body.isActive !== undefined) {
      db.prepare('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?').run(req.body.isActive ? 1 : 0, req.params.id);
      auditLog(req.user.id, 'user_update', 'user', req.params.id, { isActive: req.body.isActive });
    }
    res.json(db.prepare('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?').get(req.params.id));
  }
);

router.get('/stores', (req, res) => {
  const stores = db.prepare(
    'SELECT s.*, u.email as owner_email, u.full_name as owner_name FROM stores s JOIN users u ON s.owner_id = u.id ORDER BY s.created_at DESC'
  ).all();
  res.json(stores);
});

router.patch('/stores/:id/suspend',
  param('id').isUUID(),
  body('suspended').isBoolean(),
  (req, res) => {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    db.prepare('UPDATE stores SET is_suspended = ?, updated_at = datetime("now") WHERE id = ?').run(req.body.suspended ? 1 : 0, req.params.id);
    auditLog(req.user.id, req.body.suspended ? 'store_suspend' : 'store_restore', 'store', req.params.id, null);
    res.json(db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id));
  }
);

router.get('/audit-logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all();
  res.json(logs);
});

router.get('/stats', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get();
  const stores = db.prepare('SELECT COUNT(*) as c FROM stores').get();
  const orders = db.prepare('SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as revenue FROM orders WHERE payment_status = ?').get('paid');
  res.json({ users: users.c, stores: stores.c, orders: orders.c, revenue: orders.revenue });
});

export default router;
