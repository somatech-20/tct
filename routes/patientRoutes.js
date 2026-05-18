const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { isAuthenticated, isDoctor } = require('../middleware/authMiddleware');
const { validatePatient } = require('../middleware/validationMiddleware');

router.get('/', isAuthenticated, patientController.list);
router.get('/new', isAuthenticated, isDoctor, patientController.newForm);
router.post('/', isAuthenticated, isDoctor, validatePatient, patientController.create);
router.get('/:id', isAuthenticated, patientController.detail);
router.get('/:id/edit', isAuthenticated, isDoctor, patientController.editForm);
router.put('/:id', isAuthenticated, isDoctor, validatePatient, patientController.update);
router.delete('/:id', isAuthenticated, isDoctor, patientController.delete);
router.get('/export/csv', isAuthenticated, patientController.exportCSV);
router.get('/export/excel', isAuthenticated, patientController.exportExcel);
router.get('/export/pdf', isAuthenticated, patientController.exportPDF);

module.exports = router;
