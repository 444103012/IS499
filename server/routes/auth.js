import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'storelaunch-secret-change-in-production';

function generateToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').optional().trim(),
  body('role').isIn(['store_owner', 'customer']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { email, password, fullName, role } = req.body;
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) return res.status(400).json({ error: 'Email already registered' });
      const id = randomUUID();
      const hash = await bcrypt.hash(password, 10);
      db.prepare(
        'INSERT INTO users (id, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)'
      ).run(id, email, hash, role, fullName || null);
      if (role === 'store_owner') {
        const slug = email.split('@')[0].toLowerCase().replace(/\W/g, '') + '-' + id.slice(0, 8);
        db.prepare(
          'INSERT INTO stores (id, owner_id, name, slug) VALUES (?, ?, ?, ?)'
        ).run(randomUUID(), id, fullName || 'My Store', slug);
      }
      const user = db.prepare('SELECT id, email, role, full_name, preferred_language FROM users WHERE id = ?').get(id);
      const token = generateToken(user);
      return res.status(201).json({ user, token });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { email, password } = req.body;
      const user = db.prepare('SELECT id, email, password_hash, role, full_name, preferred_language, is_active FROM users WHERE email = ?').get(email);
      if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid email or password' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid email or password' });
      delete user.password_hash;
      const token = generateToken(user);
      return res.json({ user, token });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
);

router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

router.patch('/me',
  authMiddleware,
  body('fullName').optional().trim(),
  body('preferredLanguage').optional().isIn(['en', 'ar']),
  (req, res) => {
    const updates = [];
    const params = [];
    if (req.body.fullName !== undefined) { updates.push('full_name = ?'); params.push(req.body.fullName); }
    if (req.body.preferredLanguage !== undefined) { updates.push('preferred_language = ?'); params.push(req.body.preferredLanguage); }
    if (!updates.length) return res.json(req.user);
    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params);
    const user = db.prepare('SELECT id, email, role, full_name, preferred_language FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  }
);

export default router;
