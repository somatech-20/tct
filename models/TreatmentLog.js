const mongoose = require('mongoose');

const treatmentLogSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, required: true },
  doseTaken: { type: Boolean, default: false },
  sputumResult: { type: String, enum: ['Pending', 'Negative', 'Positive', 'Not Done'], default: 'Pending' },
  notes: { type: String }
});

module.exports = mongoose.model('TreatmentLog', treatmentLogSchema);
