const express = require('express');
const router = express.Router({ mergeParams: true });
const treatmentController = require('../controllers/treatmentController');
const { isAuthenticated, isDoctor } = require('../middleware/authMiddleware');
const { validateTreatmentLog } = require('../middleware/validationMiddleware');

router.get('/new', isAuthenticated, isDoctor, treatmentController.newForm);
router.post('/', isAuthenticated, isDoctor, validateTreatmentLog, treatmentController.create);
router.get('/:logId/edit', isAuthenticated, isDoctor, treatmentController.editForm);
router.put('/:logId', isAuthenticated, isDoctor, validateTreatmentLog, treatmentController.update);
router.delete('/:logId', isAuthenticated, isDoctor, treatmentController.delete);

module.exports = router;
