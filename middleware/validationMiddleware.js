const { body, validationResult } = require('express-validator');

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/login', { error: errors.array()[0].msg });
    }
    next();
  }
];

const validatePatient = [
  body('fullName').trim().notEmpty().escape(),
  body('age').isInt({ min: 0, max: 120 }).toInt(),
  body('gender').isIn(['Male', 'Female', 'Other']),
  body('address').trim().notEmpty().escape(),
  body('tbType').isIn(['Pulmonary', 'Extra-pulmonary']),
  body('treatmentStartDate').isISO8601().toDate(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send('Validation failed');
    }
    next();
  }
];

const validateTreatmentLog = [
  body('date').isISO8601().toDate(),
  body('doseTaken').optional().isBoolean().toBoolean(),
  body('sputumResult').isIn(['Pending', 'Negative', 'Positive', 'Not Done']),
  body('notes').optional().trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send('Validation failed');
    }
    next();
  }
];

const validateContact = [
  body('fullName').trim().notEmpty().escape(),
  body('relationship').trim().notEmpty().escape(),
  body('screeningDate').isISO8601().toDate(),
  body('symptoms').optional().trim().escape(),
  body('screeningStatus').isIn(['Pending', 'Cleared', 'Symptomatic']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send('Validation failed');
    }
    next();
  }
];

module.exports = {
  validateLogin,
  validatePatient,
  validateTreatmentLog,
  validateContact
};
