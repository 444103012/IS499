const express = require('express');
const adminAuthMiddleware = require('../middleware/adminAuth');
const {
  getPolicies,
  updatePolicies,
  getPlans,
  createPlan,
  updatePlan,
  updatePlanStatus,
  getPlatformConfig,
  updatePlatformConfig,
} = require('../controllers/adminPlatformController');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/policies', getPolicies);
router.patch('/policies', updatePolicies);

router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);
router.patch('/plans/:id/status', updatePlanStatus);

router.get('/config', getPlatformConfig);
router.patch('/config', updatePlatformConfig);

module.exports = router;

