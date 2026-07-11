const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: ['admin', 'doctor', 'receptionist'], required: true },
  preferredExportFormat: { type: String, enum: ['pdf', 'csv', 'excel'], default: 'pdf' }
});

module.exports = mongoose.model('User', userSchema);