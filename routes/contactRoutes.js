const express = require('express');
const router = express.Router({ mergeParams: true });
const contactController = require('../controllers/contactController');
const { isAuthenticated } = require('../middleware/authMiddleware');
const { validateContact } = require('../middleware/validationMiddleware');

router.get('/new', isAuthenticated, contactController.newForm);
router.post('/', isAuthenticated, validateContact, contactController.create);
router.get('/:contactId/edit', isAuthenticated, contactController.editForm);
router.put('/:contactId', isAuthenticated, validateContact, contactController.update);
router.delete('/:contactId', isAuthenticated, contactController.delete);

module.exports = router;
