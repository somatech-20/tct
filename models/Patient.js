const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  email: { type: String, required: false, unique: true, sparse: true }, // unique and sparse index for email. Coz we need it to notify patients via email and those who don't have one are exempt.
  phone: { type: String, required: false },
  fullName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  address: { type: String, required: true },
  tbType: { type: String, enum: ['Pulmonary', 'Extra-pulmonary'], required: true },
  treatmentStartDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Recovered', 'Defaulted'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  lastReminderSent: { type: Date, default: null }
});

// // Add a unique index with case‑insensitive collation
// patientSchema.index(
//   { fullName: 1 },
//   {
//     unique: true,
//     collation: { locale: 'en', strength: 2 }, // case‑insensitive
//     partialFilterExpression: { fullName: { $exists: true } }
//   }
// );

module.exports = mongoose.model('Patient', patientSchema);
