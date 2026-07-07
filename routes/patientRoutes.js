const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { isAuthenticated, isDoctor, isDoctorOrReceptionist } = require('../middleware/authMiddleware');
const { validatePatient } = require('../middleware/validationMiddleware');

router.get('/', isAuthenticated, patientController.list);
router.get('/new', isAuthenticated, patientController.newForm);
router.post('/', isAuthenticated, isDoctorOrReceptionist, validatePatient, patientController.create);
router.get('/:id', isAuthenticated, patientController.detail);
router.get('/:id/edit', isAuthenticated, isDoctorOrReceptionist, patientController.editForm);
router.put('/:id', isAuthenticated, isDoctorOrReceptionist, validatePatient, patientController.update);
router.delete('/:id', isAuthenticated, isDoctorOrReceptionist, patientController.delete);
router.get('/export/csv', isAuthenticated, patientController.exportCSV);
router.get('/export/excel', isAuthenticated, patientController.exportExcel);
router.get('/export/pdf', isAuthenticated, patientController.exportPDF);
router.get('/:id/export', isAuthenticated, patientController.exportOne);

module.exports = router;
