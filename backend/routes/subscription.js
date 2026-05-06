const express = require('express');
const router = express.Router();
const {
  getPlatformPlans,
  getPlatformPlanBySlug,
} = require('../services/platformPlansService');

async function getStoreId(pool, store_owner_id) {
  const r = await pool.query(
    'SELECT store_id FROM stores WHERE store_owner_id = $1 ORDER BY created_at DESC LIMIT 1',
    [store_owner_id]
  );
  return r.rows[0] ? r.rows[0].store_id : null;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysBetween(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}

async function getPlanMapBySlug(pool, { enabledOnly = false } = {}) {
  const plans = await getPlatformPlans(pool, { enabledOnly });
  const map = new Map();
  for (const p of plans) map.set(p.slug, p);
  return map;
}


router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const subRow = await pool.query(
      `SELECT subscription_id, plan_type, start_date, end_date, status
       FROM subscriptions
       WHERE store_id = $1
       ORDER BY subscription_id DESC LIMIT 1`,
      [store_id]
    );

    if (subRow.rows.length === 0) {
      return res.json({
        plan: null,
        planName: null,
        status: null,
        renewalDate: null,
        billingCycle: 'monthly',
        nextBillingAmount: null,
        startDate: null,
        remainingDaysInCycle: null,
      });
    }

    const s = subRow.rows[0];
    const planType = (s.plan_type || 'basic').toLowerCase();
    const plan = await getPlatformPlanBySlug(pool, planType, { enabledOnly: false });
    const startDate = s.start_date ? new Date(s.start_date) : new Date();
    let nextPaymentDate = addMonths(startDate, 1);
    if (nextPaymentDate <= new Date()) nextPaymentDate = addMonths(new Date(), 1);
    const nextBillingAmount = plan ? Number(plan.price || 0) : 0;
    const remainingDays = daysBetween(new Date(), nextPaymentDate);

    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    res.json({
      subscriptionId: s.subscription_id,
      plan: planType,
      planName: plan ? plan.name : planType.charAt(0).toUpperCase() + planType.slice(1),
      status: s.status || 'Active',
      renewalDate: nextPaymentDate.toISOString().slice(0, 10),
      billingCycle: 'monthly',
      nextBillingAmount,
      startDate: startDate.toISOString().slice(0, 10),
      remainingDaysInCycle: remainingDays,
    });
  } catch (err) {
    console.error('GET /api/subscription:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});


router.get('/plans', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const plans = await getPlatformPlans(pool, { enabledOnly: true });
    return res.json({
      plans: plans.map((p) => ({
        planId: p.slug,
        slug: p.slug,
        rank: p.rank,
        name: p.name,
        price: p.price,
        currency: 'SAR',
        period: 'month',
        features: p.features,
        limitations: [],
        status: p.status,
      })),
    });
  } catch (err) {
    console.error('GET /api/subscription/plans:', err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});


router.post('/upgrade', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { planId } = req.body || {};
    const targetSlug = String(planId || '').trim().toLowerCase();
    if (!targetSlug) return res.status(400).json({ error: 'Valid planId required' });

    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const subRow = await pool.query(
      'SELECT subscription_id, plan_type FROM subscriptions WHERE store_id = $1 ORDER BY subscription_id DESC LIMIT 1',
      [store_id]
    );
    if (subRow.rows.length === 0) return res.status(404).json({ error: 'No subscription found' });

    const currentPlan = (subRow.rows[0].plan_type || 'basic').toLowerCase();
    const plansBySlug = await getPlanMapBySlug(pool, { enabledOnly: false });
    const current = plansBySlug.get(currentPlan);
    const target = plansBySlug.get(targetSlug);
    if (!target) return res.status(400).json({ error: 'Plan not found' });
    if (target.status !== 'Enabled') return res.status(400).json({ error: 'Plan is not currently available' });
    if (!current) return res.status(400).json({ error: 'Current plan not configured' });
    if (target.rank <= current.rank) return res.status(400).json({ error: 'Target plan must be higher than current plan to upgrade' });

    const subscription_id = subRow.rows[0].subscription_id;
    const nextPayment = addMonths(new Date(), 1);

    await pool.query(
      'UPDATE subscriptions SET plan_type = $1 WHERE subscription_id = $2',
      [targetSlug, subscription_id]
    );

    res.json({ success: true, plan: targetSlug, nextPaymentDate: nextPayment.toISOString().slice(0, 10) });
  } catch (err) {
    console.error('POST /api/subscription/upgrade:', err);
    res.status(500).json({ error: 'Failed to upgrade' });
  }
});


router.post('/downgrade', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { planId } = req.body || {};
    const targetSlug = String(planId || '').trim().toLowerCase();
    if (!targetSlug) return res.status(400).json({ error: 'Valid planId required' });

    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const subRow = await pool.query(
      'SELECT subscription_id, plan_type FROM subscriptions WHERE store_id = $1 ORDER BY subscription_id DESC LIMIT 1',
      [store_id]
    );
    if (subRow.rows.length === 0) return res.status(404).json({ error: 'No subscription found' });

    const currentPlan = (subRow.rows[0].plan_type || 'basic').toLowerCase();
    const plansBySlug = await getPlanMapBySlug(pool, { enabledOnly: false });
    const current = plansBySlug.get(currentPlan);
    const target = plansBySlug.get(targetSlug);
    if (!target) return res.status(400).json({ error: 'Plan not found' });
    if (target.status !== 'Enabled') return res.status(400).json({ error: 'Plan is not currently available' });
    if (!current) return res.status(400).json({ error: 'Current plan not configured' });
    if (target.rank >= current.rank) return res.status(400).json({ error: 'Target plan must be lower than current plan to downgrade' });

    const subscription_id = subRow.rows[0].subscription_id;
    const nextPayment = addMonths(new Date(), 1);

    await pool.query(
      'UPDATE subscriptions SET plan_type = $1 WHERE subscription_id = $2',
      [targetSlug, subscription_id]
    );

    res.json({ success: true, plan: targetSlug, effectiveDate: nextPayment.toISOString().slice(0, 10) });
  } catch (err) {
    console.error('POST /api/subscription/downgrade:', err);
    res.status(500).json({ error: 'Failed to downgrade' });
  }
});


router.get('/history', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });
    res.json({ history: [] });
  } catch (err) {
    console.error('GET /api/subscription/history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

async function ensureStoreSettingsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_settings (
      store_id INTEGER PRIMARY KEY REFERENCES stores(store_id) ON DELETE CASCADE,
      info JSONB DEFAULT '{}'::JSONB,
      branding JSONB DEFAULT '{}'::JSONB,
      domain JSONB DEFAULT '{}'::JSONB,
      payments JSONB DEFAULT '{}'::JSONB,
      shipping JSONB DEFAULT '{}'::JSONB,
      policies JSONB DEFAULT '{}'::JSONB,
      footer JSONB DEFAULT '{}'::JSONB
    );
  `);
}

async function getStoreSettings(pool, store_id) {
  await ensureStoreSettingsTable(pool);
  const existing = await pool.query('SELECT * FROM store_settings WHERE store_id = $1', [store_id]);
  if (existing.rows[0]) return existing.rows[0];
  const inserted = await pool.query(
    'INSERT INTO store_settings (store_id) VALUES ($1) RETURNING *',
    [store_id]
  );
  return inserted.rows[0];
}


router.post('/payment-method', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { last4, expiryMonth, expiryYear, cardholderName, cardType } = req.body || {};

    const cleanLast4 = String(last4 || '').replace(/\D/g, '');
    if (cleanLast4.length !== 4) return res.status(400).json({ error: 'Card last 4 digits required (exactly 4 digits)' });

    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const month = parseInt(expiryMonth, 10);
    const year = parseInt(expiryYear, 10);
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2024) {
      return res.status(400).json({ error: 'Valid expiry month (1-12) and year (2024+) required' });
    }

    const paymentMethodData = {
      last4: cleanLast4,
      masked: `**** **** **** ${cleanLast4}`,
      expiryMonth: month,
      expiryYear: year,
      expiry: `${String(month).padStart(2, '0')}/${year}`,
      cardholderName: cardholderName ? String(cardholderName).trim().substring(0, 100) : null,
      cardType: cardType ? String(cardType).trim().substring(0, 30) : 'Card',
      savedAt: new Date().toISOString(),
    };

    await getStoreSettings(pool, store_id);
    await pool.query(
      `UPDATE store_settings
       SET payments = jsonb_set(COALESCE(payments, '{}'::jsonb), '{billingCard}', $1::jsonb)
       WHERE store_id = $2`,
      [JSON.stringify(paymentMethodData), store_id]
    );

    res.json({ success: true, paymentMethod: paymentMethodData });
  } catch (err) {
    console.error('POST /api/subscription/payment-method:', err);
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});


router.delete('/payment-method', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    await getStoreSettings(pool, store_id);
    await pool.query(
      `UPDATE store_settings SET payments = payments - 'billingCard' WHERE store_id = $1`,
      [store_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/subscription/payment-method:', err);
    res.status(500).json({ error: 'Failed to remove payment method' });
  }
});


router.get('/payment-method', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const settings = await getStoreSettings(pool, store_id);
    const billingCard = settings.payments?.billingCard || null;
    res.json({ paymentMethod: billingCard });
  } catch (err) {
    console.error('GET /api/subscription/payment-method:', err);
    res.status(500).json({ error: 'Failed to fetch payment method' });
  }
});

module.exports = router;