import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();

router.get('/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM subscription_plans ORDER BY price_monthly').all();
  res.json(plans);
});

router.use(authMiddleware);
router.use(requireRole('store_owner', 'admin'));

router.get('/store/:storeId', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  let sub = db.prepare(
    'SELECT ss.*, sp.name, sp.price_monthly, sp.max_products, sp.custom_domain FROM store_subscriptions ss JOIN subscription_plans sp ON ss.plan_id = sp.id WHERE ss.store_id = ? ORDER BY ss.created_at DESC LIMIT 1'
  ).get(req.params.storeId);
  const storeRow = db.prepare('SELECT subscription_plan FROM stores WHERE id = ?').get(req.params.storeId);
  if (!sub && storeRow) {
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(storeRow.subscription_plan || 'basic');
    sub = plan ? { plan_id: plan.id, name: plan.name, price_monthly: plan.price_monthly, max_products: plan.max_products, custom_domain: plan.custom_domain } : null;
  }
  const plans = db.prepare('SELECT * FROM subscription_plans ORDER BY price_monthly').all();
  res.json({ current: sub || { plan_id: 'basic', name: 'Basic', price_monthly: 0, max_products: 50, custom_domain: 0 }, plans });
});

router.post('/store/:storeId',
  body('planId').isIn(['basic', 'pro', 'advanced']),
  (req, res) => {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(req.body.planId);
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });
    const existing = db.prepare('SELECT id FROM store_subscriptions WHERE store_id = ? AND status = ?').get(req.params.storeId, 'active');
    if (existing) {
      db.prepare('UPDATE store_subscriptions SET plan_id = ?, status = ?, current_period_end = datetime("now", "+1 month") WHERE store_id = ?').run(req.body.planId, 'active', req.params.storeId);
    } else {
      db.prepare('INSERT INTO store_subscriptions (id, store_id, plan_id, status, current_period_end) VALUES (?, ?, ?, ?, datetime("now", "+1 month"))').run(randomUUID(), req.params.storeId, req.body.planId, 'active');
    }
    db.prepare('UPDATE stores SET subscription_plan = ? WHERE id = ?').run(req.body.planId, req.params.storeId);
    const sub = db.prepare('SELECT * FROM store_subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.storeId);
    res.json(sub);
  }
);

export default router;
