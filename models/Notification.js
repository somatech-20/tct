const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['PATIENT_ASSIGNED', 'TREATMENT_REMINDER', 'MISSED_DOSE', 'APPOINTMENT'], 
    default: 'PATIENT_ASSIGNED' 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  relatedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);