const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  fullName: { type: String, required: true },
  relationship: { type: String, required: true },
  screeningDate: { type: Date, required: true },
  symptoms: { type: String },
  screeningStatus: { type: String, enum: ['Pending', 'Cleared', 'Symptomatic'], default: 'Pending' }
});

module.exports = mongoose.model('Contact', contactSchema);
