const express = require('express');
const { getPlatformPlans } = require('../services/platformPlansService');

const router = express.Router();

router.get('/plans', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  try {
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
        status: p.status,
      })),
    });
  } catch (err) {
    console.error('GET /api/platform/plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

module.exports = router;