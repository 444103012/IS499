import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('customer', 'store_owner', 'admin'));

router.get('/profile', (req, res) => {
  const user = db.prepare('SELECT id, email, phone, full_name, preferred_language, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.patch('/profile',
  body('fullName').optional().trim(),
  body('phone').optional().trim(),
  body('preferredLanguage').optional().isIn(['en', 'ar']),
  (req, res) => {
    const updates = [];
    const params = [];
    if (req.body.fullName !== undefined) { updates.push('full_name = ?'); params.push(req.body.fullName); }
    if (req.body.phone !== undefined) { updates.push('phone = ?'); params.push(req.body.phone); }
    if (req.body.preferredLanguage !== undefined) { updates.push('preferred_language = ?'); params.push(req.body.preferredLanguage); }
    if (!updates.length) return res.json(req.user);
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);
    const user = db.prepare('SELECT id, email, phone, full_name, preferred_language FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  }
);

export default router;
