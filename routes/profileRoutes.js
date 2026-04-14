const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

router.get('/', isAuthenticated, profileController.show);
router.post('/password', isAuthenticated, profileController.updatePassword);

module.exports = router;