const express = require('express');
const { hashPassword } = require('../lib/auth');

const router = express.Router();

function createRegisterRoutes(pool) {
  // POST /api/register/store-owner
  router.post('/store-owner', async (req, res) => {
    const client = await pool.connect();
    try {
      const { firstName, lastName, email, password, storeName, phone } = req.body;
      if (!firstName || !lastName || !email || !password || !storeName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: firstName, lastName, email, password, storeName',
        });
      }
      
      const passwordHash = hashPassword(password);
      
      await client.query('BEGIN');
      
      // Insert store owner
      const ownerResult = await client.query(
        `INSERT INTO store_owners (first_name, last_name, email, password_hash, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING store_owner_id, first_name, last_name, email, phone, created_at`,
        [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash, phone ? phone.trim() : null]
      );
      
      const owner = ownerResult.rows[0];
      
      // Create store entry
      const storeResult = await client.query(
        `INSERT INTO stores (store_owner_id, name)
         VALUES ($1, $2)
         RETURNING store_id, name`,
        [owner.store_owner_id, storeName.trim()]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        user: {
          id: owner.store_owner_id,
          firstName: owner.first_name,
          lastName: owner.last_name,
          email: owner.email,
          storeName: storeResult.rows[0].name,
          phone: owner.phone,
          createdAt: owner.created_at,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }
      console.error('Register store-owner error:', err);
      res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
    } finally {
      client.release();
    }
  });

  // POST /api/register/customer
  router.post('/customer', async (req, res) => {
    try {
      const { firstName, lastName, email, password, phone } = req.body;
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: firstName, lastName, email, password',
        });
      }
      
      const passwordHash = hashPassword(password);
      const result = await pool.query(
        `INSERT INTO customers (first_name, last_name, email, password_hash, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING customer_id, first_name, last_name, email, phone, created_at`,
        [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash, phone ? phone.trim() : null]
      );
      const row = result.rows[0];
      res.status(201).json({
        success: true,
        user: {
          id: row.customer_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          createdAt: row.created_at,
        },
      });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }
      console.error('Register customer error:', err);
      res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
    }
  });

  return router;
}

module.exports = createRegisterRoutes;
