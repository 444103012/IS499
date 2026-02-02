import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();

function canAccessStore(storeId, user) {
  if (!user) return false;
  const store = db.prepare('SELECT owner_id FROM stores WHERE id = ?').get(storeId);
  if (!store) return false;
  return store.owner_id === user.id || user.role === 'admin';
}

router.get('/store/:storeId', optionalAuth, (req, res) => {
  const { storeId } = req.params;
  const store = db.prepare('SELECT id, is_suspended FROM stores WHERE id = ? AND is_active = 1').get(storeId);
  if (!store || store.is_suspended) return res.status(404).json({ error: 'Store not found' });
  const q = req.query.q;
  const categoryId = req.query.categoryId;
  let sql = 'SELECT id, store_id, category_id, name_ar, name_en, description_ar, description_en, price, compare_at_price, image_url, images, options, stock_quantity FROM products WHERE store_id = ? AND is_active = 1';
  const params = [storeId];
  if (q) { sql += ' AND (name_en LIKE ? OR name_ar LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (categoryId) { sql += ' AND category_id = ?'; params.push(categoryId); }
  sql += ' ORDER BY created_at DESC';
  const products = db.prepare(sql).all(...params);
  res.json(products);
});

router.get('/store/:storeId/categories', (req, res) => {
  const store = db.prepare('SELECT id FROM stores WHERE id = ? AND is_active = 1 AND is_suspended = 0').get(req.params.storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const categories = db.prepare('SELECT id, name_ar, name_en, parent_id FROM categories WHERE store_id = ?').all(req.params.storeId);
  res.json(categories);
});

router.get('/:id', (req, res) => {
  const product = db.prepare(
    'SELECT p.*, s.name as store_name, s.slug as store_slug FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = ? AND p.is_active = 1 AND s.is_suspended = 0'
  ).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.use(authMiddleware);
router.use(requireRole('store_owner', 'admin'));

router.get('/manage/:storeId', (req, res) => {
  if (!canAccessStore(req.params.storeId, req.user)) return res.status(403).json({ error: 'Forbidden' });
  const products = db.prepare('SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC').all(req.params.storeId);
  res.json(products);
});

router.post('/manage/:storeId',
  body('nameEn').trim().notEmpty(),
  body('nameAr').optional().trim(),
  body('descriptionEn').optional().trim(),
  body('descriptionAr').optional().trim(),
  body('price').isFloat({ min: 0 }),
  body('compareAtPrice').optional().isFloat({ min: 0 }),
  body('sku').optional().trim(),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('imageUrl').optional().trim(),
  body('categoryId').optional(),
  (req, res) => {
    if (!canAccessStore(req.params.storeId, req.user)) return res.status(403).json({ error: 'Forbidden' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = randomUUID();
    const {
      nameEn, nameAr, descriptionEn, descriptionAr, price, compareAtPrice, sku, stockQuantity, imageUrl, categoryId
    } = req.body;
    db.prepare(
      `INSERT INTO products (id, store_id, category_id, name_en, name_ar, description_en, description_ar, price, compare_at_price, sku, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.params.storeId, categoryId || null, nameEn, nameAr || null, descriptionEn || null, descriptionAr || null, price, compareAtPrice || null, sku || null, stockQuantity ?? 0, imageUrl || null);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(product);
  }
);

router.put('/:id',
  param('id').isUUID(),
  body('nameEn').optional().trim().notEmpty(),
  body('nameAr').optional().trim(),
  body('descriptionEn').optional().trim(),
  body('descriptionAr').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!canAccessStore(product.store_id, req.user)) return res.status(403).json({ error: 'Forbidden' });
    const updates = [];
    const params = [];
    ['nameEn', 'nameAr', 'descriptionEn', 'descriptionAr', 'price', 'stockQuantity', 'isActive'].forEach(f => {
      const key = f === 'nameEn' ? 'name_en' : f === 'nameAr' ? 'name_ar' : f === 'descriptionEn' ? 'description_en' : f === 'descriptionAr' ? 'description_ar' : f === 'stockQuantity' ? 'stock_quantity' : f === 'isActive' ? 'is_active' : f;
      const v = req.body[f];
      if (v !== undefined) { updates.push(`${key} = ?`); params.push(typeof v === 'boolean' ? (v ? 1 : 0) : v); }
    });
    if (!updates.length) return res.json(product);
    params.push(req.params.id);
    db.prepare(`UPDATE products SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);
    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  }
);

router.delete('/:id', param('id').isUUID(), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!canAccessStore(product.store_id, req.user)) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deactivated' });
});

export default router;
