const express = require('express');
const bcrypt = require('bcryptjs');
const { validatePasswordChangeInput } = require('../utils/passwordValidation');

const router = express.Router();

async function ensureOwnerSettingsColumns(pool) {
  await pool.query(`
    ALTER TABLE store_owners
    ADD COLUMN IF NOT EXISTS profile_settings JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS business_settings JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS language_pref TEXT;
  `);
}


router.get('/profile', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  try {
    await ensureOwnerSettingsColumns(pool);
    const r = await pool.query(
      `SELECT first_name, last_name, email, phone, profile_settings, business_settings,
              notification_settings, security_settings, language_pref
       FROM store_owners
       WHERE store_owner_id = $1`,
      [store_owner_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('settings GET /profile:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});


router.put('/profile', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { name, phone, profile_settings } = req.body || {};
  try {
    await ensureOwnerSettingsColumns(pool);
    const firstName = name && typeof name === 'string' ? name.substring(0, 100) : null;
    await pool.query(
      `UPDATE store_owners
       SET first_name = COALESCE($1, first_name),
           phone = COALESCE($2, phone),
           profile_settings = COALESCE($3, profile_settings)
       WHERE store_owner_id = $4`,
      [firstName, phone || null, profile_settings || null, store_owner_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('settings PUT /profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


router.put('/password', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { currentPassword, newPassword } = req.body || {};
  const validationError = validatePasswordChangeInput(currentPassword, newPassword);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const ownerResult = await pool.query(
      'SELECT password_hash FROM store_owners WHERE store_owner_id = $1',
      [store_owner_id]
    );
    if (!ownerResult.rows[0]) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    const isCurrentValid = await bcrypt.compare(currentPassword, ownerResult.rows[0].password_hash);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'InvalidCurrentPassword' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE store_owners SET password_hash = $1 WHERE store_owner_id = $2',
      [newHash, store_owner_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('settings PUT /password:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});


router.put('/language', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { language } = req.body || {};
  if (!['en', 'ar'].includes(language)) {
    return res.status(400).json({ error: 'Invalid language' });
  }
  try {
    await ensureOwnerSettingsColumns(pool);
    await pool.query(
      'UPDATE store_owners SET language_pref = $1 WHERE store_owner_id = $2',
      [language, store_owner_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('settings PUT /language:', err);
    res.status(500).json({ error: 'Failed to update language' });
  }
});


router.put('/notifications', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { notifications } = req.body || {};
  if (!notifications || typeof notifications !== 'object') {
    return res.status(400).json({ error: 'notifications object required' });
  }
  try {
    await ensureOwnerSettingsColumns(pool);
    await pool.query(
      'UPDATE store_owners SET notification_settings = $1 WHERE store_owner_id = $2',
      [notifications, store_owner_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('settings PUT /notifications:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});


router.get('/security/sessions', async (req, res) => {
  
  const { store_owner_id } = req.user;
  res.json({
    sessions: [
      {
        id: `${store_owner_id}-current`,
        device: 'Current device',
        ip: req.ip,
        last_active: new Date().toISOString(),
      },
    ],
  });
});


router.delete('/security/sessions', async (req, res) => {
  
  res.json({ success: true });
});


router.put('/security/2fa', async (req, res) => {
  const pool = req.app.locals.pool;
  const { store_owner_id } = req.user;
  const { enabled } = req.body || {};
  try {
    await ensureOwnerSettingsColumns(pool);
    const r = await pool.query(
      'SELECT security_settings FROM store_owners WHERE store_owner_id = $1',
      [store_owner_id]
    );
    const sec = (r.rows[0] && r.rows[0].security_settings) || {};
    sec.twoFactorEnabled = !!enabled;
    await pool.query(
      'UPDATE store_owners SET security_settings = $1 WHERE store_owner_id = $2',
      [sec, store_owner_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('settings PUT /security/2fa:', err);
    res.status(500).json({ error: 'Failed to update 2FA' });
  }
});

module.exports = router;