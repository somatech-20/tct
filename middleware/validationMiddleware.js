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
//   body('fullName').trim().notEmpty().withMessage('Full name is required').escape(),
//   body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150').toInt(),
//   body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender selection'),
//   body('tbType').isIn(['Pulmonary', 'Extra-pulmonary']).withMessage('Invalid TB type'),
//   body('treatmentStartDate').isISO8601().withMessage('Invalid date format').toDate(),
//   body('status').optional().isIn(['Active', 'Recovered', 'Defaulted']),
  
//   // New fields
//   body('email').optional().isEmail().withMessage('Invalid email address').normalizeEmail(),
//   body('phone').optional().isString().trim().escape(),
//   body('maritalStatus').optional().isIn(['Single', 'Married', 'Divorced', 'Widowed']).withMessage('Invalid marital status'),
//   body('district').notEmpty().withMessage('District is required').isString().trim().escape(),
//   body('isReturnee').optional().isBoolean().toBoolean(),
//   body('previousTreatmentDate').optional().isISO8601().withMessage('Invalid date format').toDate(),
//   body('assignedDoctor').optional().isMongoId().withMessage('Invalid doctor ID'),
  
//   // Emergency Contact (nested object)
//   body('emergencyContact.name').optional().isString().trim().escape(),
//   body('emergencyContact.relationship').optional().isString().trim().escape(),
//   body('emergencyContact.phone').optional().isString().trim().escape(),
  
//   // Custom validation: if isReturnee is true, previousTreatmentDate is required
//   body('previousTreatmentDate').custom((value, { req }) => {
//     if (req.body.isReturnee === 'true' || req.body.isReturnee === true) {
//       if (!value) {
//         throw new Error('Previous treatment date is required for returnee patients');
//       }
//     }
//     return true;
//   }),
  
//   // Custom validation: if assignedDoctor is provided, it must be a valid doctor
//   body('assignedDoctor').custom(async (value) => {
//     if (value) {
//       const User = require('../models/User');
//       const doctor = await User.findOne({ _id: value, role: 'doctor' });
//       if (!doctor) {
//         throw new Error('Selected doctor does not exist or is not a doctor');
//       }
//       return true;
//     }
//     return true;
//   }),

//   // // Error handler
//   // (req, res, next) => {
//   //   const errors = validationResult(req);
//   //   if (!errors.isEmpty()) {
//   //     // For AJAX requests
//   //     if (req.xhr || req.headers.accept?.includes('application/json')) {
//   //       return res.status(400).json({ errors: errors.array() });
//   //     }
//   //     // For regular form submissions - redirect back with errors
//   //     req.flash = req.flash || {};
//   //     req.flash.errors = errors.array();
//   //     return res.status(400).render('patients/form', {
//   //       patient: req.body,
//   //       errors: errors.array(),
//   //       doctors: res.locals.doctors || []
//   //     });
//   //   }
//   //   next();
//   // }
//     // Error handler
//   async (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       // Fetch doctors list for the form
//       const User = require('../models/User');
//       const doctors = await User.find({ role: 'doctor' }).select('username fullName');
      
//       // Prepare patient data for the form
//       const patientData = {
//         ...req.body,
//         _id: req.params?.id || req.body._id,
//         // Ensure emergencyContact is properly structured
//         emergencyContact: {
//           name: req.body.emergencyContact?.name || '',
//           relationship: req.body.emergencyContact?.relationship || '',
//           phone: req.body.emergencyContact?.phone || ''
//         }
//       };

//       // Determine if we're editing or creating
//       const isEdit = !!req.params?.id || !!req.body._id;
      
//       return res.status(400).render('patients/form', {
//         patient: patientData,
//         doctors: doctors,
//         errors: errors.array(),
//         // Pass the correct action URL
//         action: isEdit ? `/patients/${req.params.id || req.body._id}?_method=PUT` : '/patients'
//       });
//     }
//     next();
//   }
// ];

const validatePatient = [
  // Required fields (always validated)
  body('fullName').trim().notEmpty().withMessage('Full name is required').escape(),
  body('age').isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150').toInt(),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender selection'),
  body('tbType').isIn(['Pulmonary', 'Extra-pulmonary']).withMessage('Invalid TB type'),
  body('treatmentStartDate').isISO8601().withMessage('Invalid date format').toDate(),
  body('district').notEmpty().withMessage('District is required').isString().trim().escape(),
  
  // Optional fields (allow empty)
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isString().trim().escape(),
  body('maritalStatus').optional({ checkFalsy: true }).isIn(['Single', 'Married', 'Divorced', 'Widowed']).withMessage('Invalid marital status'),
  body('status').optional({ checkFalsy: true }).isIn(['Active', 'Recovered', 'Defaulted']),
  body('isReturnee').optional({ checkFalsy: true }).isBoolean().toBoolean(),
  body('previousTreatmentDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format').toDate(),
  
  // assignedDoctor - optional but if provided must be valid
  body('assignedDoctor')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid doctor ID')
    .custom(async (value) => {
      if (value) {
        const User = require('../models/User');
        const doctor = await User.findOne({ _id: value, role: 'doctor' });
        if (!doctor) {
          throw new Error('Selected doctor does not exist or is not a doctor');
        }
        return true;
      }
      return true;
    }),
  
  // Emergency Contact (nested object)
  body('emergencyContact.name').optional({ checkFalsy: true }).isString().trim().escape(),
  body('emergencyContact.relationship').optional({ checkFalsy: true }).isString().trim().escape(),
  body('emergencyContact.phone').optional({ checkFalsy: true }).isString().trim().escape(),
  
  // Custom validation: if isReturnee is true, previousTreatmentDate is required
  body('previousTreatmentDate').custom((value, { req }) => {
    const isReturnee = req.body.isReturnee === 'true' || req.body.isReturnee === true;
    if (isReturnee && !value) {
      throw new Error('Previous treatment date is required for returnee patients');
    }
    return true;
  }),

  // Error handler
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const User = require('../models/User');
      const doctors = await User.find({ role: 'doctor' }).select('username fullName');
      
      const patientData = {
        ...req.body,
        _id: req.params?.id || req.body._id,
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
        errors: errors.array(),
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
