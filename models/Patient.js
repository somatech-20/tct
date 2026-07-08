const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    patientId: { 
    type: String, 
    unique: true,
    required: true,
    default: function() {
      return this.generatePatientId();
    }
  },

  // Contact Info
  email: { type: String, required: false, lowercase: true, trim: true, unique: true, sparse: true  },
  phone: { type: String, required: false, trim: true },
  
  // Personal Info
  fullName: { type: String, required: true, trim: true },
  age: { type: Number, required: true, min: 0, max: 150 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  maritalStatus: { 
    type: String, 
    enum: ['Single', 'Married', 'Divorced', 'Widowed'], 
    required: false 
  },
  
  // Location
  district: { 
    type: String, 
    enum: [
      'Hodan', 'Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley',
      'Hamar-Jajab', 'Hamar-Weyne', 'Howl-Wadag', 'Huriwa', 'Kaxda',
      'Karan', 'Shangani', 'Shibis', 'Waberi', 'Wadajir',
      'Warta Nabada', 'Yaqshid', 'Daarusalaam', 'Garasbaaley', 'Gubadle'
    ], 
    required: true 
  },
  
  // TB Details
  tbType: { type: String, enum: ['Pulmonary', 'Extra-pulmonary'], required: true },
  treatmentStartDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Active', 'Recovered', 'Defaulted'], 
    default: 'Active' 
  },
  
  // Returnee / Recurrent
  isReturnee: { type: Boolean, default: false },
  previousTreatmentDate: { type: Date, required: false },
  
  // Emergency Contact (nested object)
  emergencyContact: {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  
  // Assignment & Registration
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  lastReminderSent: { type: Date, default: null }
});

// Generate unique patient ID (TCT-XXXX)
patientSchema.methods.generatePatientId = function() {
  const prefix = 'TCT';
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `${prefix}-${randomNum}`;
};

// Pre-save middleware to ensure patientId exists
patientSchema.pre('save', function(next) {
  if (!this.patientId) {
    this.patientId = this.generatePatientId();
  }
  next();
});

// Indexes for performance
patientSchema.index({ fullName: 1 });
patientSchema.index({ district: 1 });
patientSchema.index({ status: 1 });
patientSchema.index({ assignedDoctor: 1 });
patientSchema.index({ isReturnee: 1 });

// In models/Patient.js, add this index
patientSchema.index({ email: 1 }, { 
  unique: true, 
  sparse: true, 
  partialFilterExpression: { email: { $type: 'string' } } 
});

// // Unique constraint on fullName (case-insensitive)
// patientSchema.index({ fullName: 1 }, { 
//   unique: true,
//   collation: { locale: 'en', strength: 2 } // Case-insensitive
// });

module.exports = mongoose.model('Patient', patientSchema);