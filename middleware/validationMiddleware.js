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

// const validatePatient = [
//   // Required fields (must be provided)
//   body('fullName')
//     .trim()
//     .notEmpty()
//     .withMessage('Full name is required')
//     .isLength({ min: 2, max: 100 })
//     .withMessage('Full name must be between 2 and 100 characters')
//     .matches(/^[a-zA-Z\s\-']+$/)
//     .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes')
//     .escape(),
//   body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150').toInt(),
//   body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender selection'),
//   body('tbType').isIn(['Pulmonary', 'Extra-pulmonary']).withMessage('Invalid TB type'),
//   body('treatmentStartDate').isISO8601().withMessage('Invalid date format').toDate(),
//   body('district').notEmpty().withMessage('District is required').isString().trim().escape(),
//   body('email')
//     .optional({ checkFalsy: true })
//     .isEmail()
//     .withMessage('Invalid email address')
//     .normalizeEmail()
//     .custom(async (value, { req }) => {
//       if (value) {
//         const Patient = require('../models/Patient');
//         const existing = await Patient.findOne({
//           email: value,
//           _id: { $ne: req.params?.id || null }
//         });
//         if (existing) {
//           throw new Error('Email already exists in the system');
//         }
//       }
//       return true;
//     }),
//   // Optional fields - allow empty
//   // body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address').normalizeEmail(),
//   body('phone').optional({ checkFalsy: true }).isString().trim().escape(),
//   body('maritalStatus').optional({ checkFalsy: true }).isIn(['Single', 'Married', 'Divorced', 'Widowed']).withMessage('Invalid marital status'),
//   body('status').optional({ checkFalsy: true }).isIn(['Active', 'Recovered', 'Defaulted']),

//   // isReturnee - handle properly
//   body('isReturnee')
//     .optional({ checkFalsy: true })
//     .customSanitizer(value => {
//       // Convert checkbox "on" to true, empty to false
//       if (value === 'on' || value === true || value === 'true' || value === '1') {
//         return true;
//       }
//       return false;
//     })
//     .isBoolean()
//     .withMessage('Invalid value for returnee status'),

//   // previousTreatmentDate - only required if isReturnee is true
//   body('previousTreatmentDate')
//     .optional({ checkFalsy: true })
//     .isISO8601()
//     .withMessage('Invalid date format')
//     .toDate()
//     .custom((value, { req }) => {
//       const isReturnee = req.body.isReturnee === 'true' || req.body.isReturnee === true;
//       if (isReturnee && !value) {
//         throw new Error('Previous treatment date is required for returnee patients');
//       }
//       return true;
//     }),

//   // assignedDoctor - properly handle empty values
//   body('assignedDoctor')
//     .optional({ checkFalsy: true })
//     .custom(async (value) => {
//       if (!value || value === '' || value === 'unassigned' || value === 'off') {
//         return true; // Allow empty/unassigned
//       }
//       // Validate it's a valid MongoDB ObjectId
//       if (!value.match(/^[0-9a-fA-F]{24}$/)) {
//         throw new Error('Invalid doctor ID format');
//       }
//       const User = require('../models/User');
//       const doctor = await User.findOne({ _id: value, role: 'doctor' });
//       if (!doctor) {
//         throw new Error('Selected doctor does not exist or is not a doctor');
//       }
//       return true;
//     }),

//   // Emergency Contact (nested object)
//   body('emergencyContact.name').optional({ checkFalsy: true }).isString().trim().escape(),
//   body('emergencyContact.relationship').optional({ checkFalsy: true }).isString().trim().escape(),
//   body('emergencyContact.phone').optional({ checkFalsy: true }).isString().trim().escape(),

//   // Error handler with detailed error messages
//   async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       // Build detailed error messages with field names
//       const errorMessages = errors.array().map(err => ({
//         field: err.path || err.param || 'unknown',
//         msg: err.msg,
//         value: err.value
//       }));

//       const User = require('../models/User');
//       const doctors = await User.find({ role: 'doctor' }).select('username fullName');

//       const patientData = {
//         ...req.body,
//         _id: req.params?.id || req.body._id,
//         isReturnee: req.body.isReturnee === 'true' || req.body.isReturnee === true,
//         emergencyContact: {
//           name: req.body.emergencyContact?.name || '',
//           relationship: req.body.emergencyContact?.relationship || '',
//           phone: req.body.emergencyContact?.phone || ''
//         }
//       };

//       const isEdit = !!req.params?.id || !!req.body._id;

//       // Log errors for debugging
//       console.log('Validation errors:', JSON.stringify(errorMessages, null, 2));

//       return res.status(400).render('patients/form', {
//         patient: patientData,
//         doctors: doctors,
//         errors: errorMessages,
//         action: isEdit ? `/patients/${req.params.id || req.body._id}?_method=PUT` : '/patients'
//       });
//     }
//     next();
//   }
// ];

const validatePatient = [
  // Required fields
  body('fullName').trim().notEmpty().withMessage('Full name is required').escape(),
  body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150').toInt(),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender selection'),
  body('tbType').isIn(['Pulmonary', 'Extra-pulmonary']).withMessage('Invalid TB type'),
  body('treatmentStartDate').isISO8601().withMessage('Invalid date format').toDate(),
  body('district').notEmpty().withMessage('District is required').isString().trim().escape(),
  
  // Optional fields
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isString().trim().escape(),
  body('maritalStatus').optional({ checkFalsy: true }).isIn(['Single', 'Married', 'Divorced', 'Widowed']).withMessage('Invalid marital status'),
  body('status').optional({ checkFalsy: true }).isIn(['Active', 'Recovered', 'Defaulted']),
  
  // isReturnee - handle checkbox "on" value
  body('isReturnee')
    .optional({ checkFalsy: true })
    .customSanitizer(value => {
      // Convert checkbox values to boolean
      if (value === 'on' || value === true || value === 'true' || value === '1') {
        return true;
      }
      return false;
    })
    .isBoolean()
    .withMessage('Invalid value for returnee status'),
  
  // previousTreatmentDate - only required if isReturnee is true
  body('previousTreatmentDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format')
    .toDate()
    .custom((value, { req }) => {
      const isReturnee = req.body.isReturnee === 'on' || req.body.isReturnee === true || req.body.isReturnee === 'true';
      if (isReturnee && !value) {
        throw new Error('Previous treatment date is required for returnee patients');
      }
      return true;
    }),
  
  // assignedDoctor
  body('assignedDoctor')
    .optional({ checkFalsy: true })
    .custom(async (value) => {
      if (!value || value === '' || value === 'unassigned' || value === 'off') {
        return true;
      }
      if (!value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Invalid doctor ID format');
      }
      const User = require('../models/User');
      const doctor = await User.findOne({ _id: value, role: 'doctor' });
      if (!doctor) {
        throw new Error('Selected doctor does not exist or is not a doctor');
      }
      return true;
    }),
  
  // Emergency Contact
  body('emergencyContact.name').optional({ checkFalsy: true }).isString().trim().escape(),
  body('emergencyContact.relationship').optional({ checkFalsy: true }).isString().trim().escape(),
  body('emergencyContact.phone').optional({ checkFalsy: true }).isString().trim().escape(),

  // Error handler
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const User = require('../models/User');
      const doctors = await User.find({ role: 'doctor' }).select('username fullName');
      
      const errorMessages = errors.array().map(err => ({
        field: err.path || err.param || 'unknown',
        msg: err.msg,
        value: err.value
      }));
      
      const patientData = {
        ...req.body,
        _id: req.params?.id || req.body._id,
        isReturnee: req.body.isReturnee === 'on' || req.body.isReturnee === true || req.body.isReturnee === 'true',
        emergencyContact: {
          name: req.body.emergencyContact?.name || '',
          relationship: req.body.emergencyContact?.relationship || '',
          phone: req.body.emergencyContact?.phone || ''
        }
      };

      const isEdit = !!req.params?.id || !!req.body._id;
      
      return res.status(400).render('patients/form', {
        patient: patientData,
        doctors: doctors,
        errors: errorMessages,
        action: isEdit ? `/patients/${req.params.id || req.body._id}?_method=PUT` : '/patients'
      });
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
