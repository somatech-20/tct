const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin } = require('../middleware/validationMiddleware');

router.get('/login', authController.getLogin);
router.post('/login', validateLogin, authController.postLogin);
router.get('/logout', authController.logout);

module.exports = router;
