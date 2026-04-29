const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const adminAuthMiddleware = require('../middleware/adminAuth');

router.post('/login', adminAuthController.loginAdmin);
router.post('/logout', adminAuthController.logoutAdmin);

router.get('/me', adminAuthMiddleware, adminAuthController.getAuthenticatedAdmin);

module.exports = router;
