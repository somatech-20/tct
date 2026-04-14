const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.get('/', isAuthenticated, isAdmin, userController.list);
router.get('/new', isAuthenticated, isAdmin, userController.newForm);
router.post('/', isAuthenticated, isAdmin, userController.create);
router.get('/:id/edit', isAuthenticated, isAdmin, userController.editForm);
router.put('/:id', isAuthenticated, isAdmin, userController.update);
router.delete('/:id', isAuthenticated, isAdmin, userController.delete);

module.exports = router;