const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, reportController.index);
router.post('/export', isAuthenticated, reportController.export);

module.exports = router;