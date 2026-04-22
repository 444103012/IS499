const express = require('express');
const router = express.Router();

const PLAN_PRICES = { basic: 0, pro: 69, advanced: 199 };
const PLAN_ORDER = ['basic', 'pro', 'advanced'];

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
    const startDate = s.start_date ? new Date(s.start_date) : new Date();
    let nextPaymentDate = addMonths(startDate, 1);
    if (nextPaymentDate <= new Date()) nextPaymentDate = addMonths(new Date(), 1);
    const nextBillingAmount = PLAN_PRICES[planType] ?? 0;
    const remainingDays = daysBetween(new Date(), nextPaymentDate);

    res.json({
      subscriptionId: s.subscription_id,
      plan: planType,
      planName: planType.charAt(0).toUpperCase() + planType.slice(1),
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
  const plans = [
    {
      planId: 'basic',
      name: 'Basic',
      price: 0,
      currency: 'SAR',
      period: 'month',
      features: ['Bank Transfer only', 'Manual Shipping', 'Default Theme Only', 'Arabic & English Support'],
      limitations: ['No advanced reports', 'No custom domain'],
    },
    {
      planId: 'pro',
      name: 'Pro',
      price: 69,
      currency: 'SAR',
      period: 'month',
      features: ['All Basic Features', 'Expanded Payment Options', 'More Shipping Providers', 'Standard Themes', 'Standard Reports & Analytics'],
      limitations: ['No custom domain', 'No POS integration'],
    },
    {
      planId: 'advanced',
      name: 'Advanced',
      price: 199,
      currency: 'SAR',
      period: 'month',
      features: ['All Pro Features', 'Advanced Reports & Analytics (Export)', 'Custom Domain', 'Advanced Themes', 'Marketing & Conversion Tools', 'POS Integration'],
      limitations: [],
    },
  ];
  res.json({ plans });
});

router.post('/upgrade', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { planId } = req.body || {};
    if (!planId || !['basic', 'pro', 'advanced'].includes(planId)) return res.status(400).json({ error: 'Valid planId required (basic, pro, advanced)' });

    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const subRow = await pool.query(
      'SELECT subscription_id, plan_type FROM subscriptions WHERE store_id = $1 ORDER BY subscription_id DESC LIMIT 1',
      [store_id]
    );
    if (subRow.rows.length === 0) return res.status(404).json({ error: 'No subscription found' });

    const currentPlan = (subRow.rows[0].plan_type || 'basic').toLowerCase();
    const currentIdx = PLAN_ORDER.indexOf(currentPlan);
    const newIdx = PLAN_ORDER.indexOf(planId);
    if (newIdx <= currentIdx) return res.status(400).json({ error: 'Target plan must be higher than current plan to upgrade' });

    const subscription_id = subRow.rows[0].subscription_id;
    const nextPayment = addMonths(new Date(), 1);

    await pool.query(
      'UPDATE subscriptions SET plan_type = $1 WHERE subscription_id = $2',
      [planId, subscription_id]
    );

    res.json({ success: true, plan: planId, nextPaymentDate: nextPayment.toISOString().slice(0, 10) });
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
    if (!planId || !['basic', 'pro', 'advanced'].includes(planId)) return res.status(400).json({ error: 'Valid planId required' });

    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const subRow = await pool.query(
      'SELECT subscription_id, plan_type FROM subscriptions WHERE store_id = $1 ORDER BY subscription_id DESC LIMIT 1',
      [store_id]
    );
    if (subRow.rows.length === 0) return res.status(404).json({ error: 'No subscription found' });

    const currentPlan = (subRow.rows[0].plan_type || 'basic').toLowerCase();
    const currentIdx = PLAN_ORDER.indexOf(currentPlan);
    const newIdx = PLAN_ORDER.indexOf(planId);
    if (newIdx >= currentIdx) return res.status(400).json({ error: 'Target plan must be lower than current plan to downgrade' });

    const subscription_id = subRow.rows[0].subscription_id;
    const nextPayment = addMonths(new Date(), 1);

    await pool.query(
      'UPDATE subscriptions SET plan_type = $1 WHERE subscription_id = $2',
      [planId, subscription_id]
    );

    res.json({ success: true, plan: planId, effectiveDate: nextPayment.toISOString().slice(0, 10) });
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

router.post('/payment-method', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { store_owner_id } = req.user;
    const { last4, expiryMonth, expiryYear } = req.body || {};
    if (!last4 || String(last4).replace(/\D/g, '').length !== 4) return res.status(400).json({ error: 'Card last 4 digits required' });

    const store_id = await getStoreId(pool, store_owner_id);
    if (!store_id) return res.status(404).json({ error: 'Store not found' });

    const month = parseInt(expiryMonth, 10);
    const year = parseInt(expiryYear, 10);
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000) {
      return res.status(400).json({ error: 'Valid expiry month (1-12) and year required' });
    }

    res.json({ success: true });
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
    res.json({ paymentMethod: null });
  } catch (err) {
    console.error('GET /api/subscription/payment-method:', err);
    res.status(500).json({ error: 'Failed to fetch payment method' });
  }
});

module.exports = router;