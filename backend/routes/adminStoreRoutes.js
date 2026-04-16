const express = require('express');
const adminAuthMiddleware = require('../middleware/adminAuth');
const {
  getAllStores,
  getStoreById,
  updateStoreStatus,
  notifyStoreOwner,
} = require('../controllers/adminStoreController');

const router = express.Router();

router.use(adminAuthMiddleware);

router.get('/stores', getAllStores);

router.get('/stores/:id', getStoreById);

router.patch('/stores/:id/status', updateStoreStatus);

router.post('/stores/:id/notify', notifyStoreOwner);

module.exports = router;

