const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, notificationController.index);
router.get('/api/unread-count', isAuthenticated, notificationController.unreadCount);
router.get('/api/recent', isAuthenticated, notificationController.recent);
router.put('/api/:id/read', isAuthenticated, notificationController.markRead);
router.put('/api/mark-all-read', isAuthenticated, notificationController.markAllRead);

module.exports = router;