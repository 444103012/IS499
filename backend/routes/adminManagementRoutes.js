const express = require('express');
const router = express.Router();
const adminAuthMiddleware = require('../middleware/adminAuth');
const {
  getAllUsers,
  getAllStoreOwners,
  updateUserStatus,
  updateStoreOwnerStatus,
  getDashboardStats,
} = require('../controllers/adminManagementController');

router.use(adminAuthMiddleware);

router.get('/users', getAllUsers);
router.get('/store-owners', getAllStoreOwners);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/store-owners/:id/status', updateStoreOwnerStatus);

module.exports = { router, getDashboardStats };
