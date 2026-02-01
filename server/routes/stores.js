import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();

router.get('/public/:slug', (req, res) => {
  const store = db.prepare(
    'SELECT id, name, slug, description, logo_url, theme, theme_colors FROM stores WHERE slug = ? AND is_active = 1 AND is_suspended = 0'
  ).get(req.params.slug);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json(store);
});

router.use(authMiddleware);
router.use(requireRole('store_owner', 'admin'));

router.get('/my', (req, res) => {
  const stores = db.prepare(
    'SELECT * FROM stores WHERE owner_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(stores);
});

router.get('/:id', param('id').isUUID(), (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  if (store.owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(store);
});

router.put('/:id',
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('theme').optional().trim(),
  body('themeColors').optional(),
  (req, res) => {
    const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    if (store.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const { name, description, theme, themeColors } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (theme !== undefined) { updates.push('theme = ?'); params.push(theme); }
    if (themeColors !== undefined) { updates.push('theme_colors = ?'); params.push(JSON.stringify(themeColors)); }
    if (!updates.length) return res.json(store);
    params.push(req.params.id);
    db.prepare(`UPDATE stores SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM stores WHERE id = ?').get(req.params.id);
    res.json(updated);
  }
);

export default router;
