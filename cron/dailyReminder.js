const cron = require('node-cron');
const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const transporter = require('../config/email');

cron.schedule('0 9 * * *', async () => {
  const today = new Date();
  const patients = await Patient.find({ status: 'Active' });
  for (const patient of patients) {
    const lastLog = await TreatmentLog.findOne({ patient: patient._id }).sort('-date');
    if (!lastLog || lastLog.date < new Date(today - 2*24*60*60*1000)) {
      // missed 2 days
      await transporter.sendMail({
        to: patient.email,
        subject: 'TB Treatment Reminder',
        text: `Dear ${patient.fullName}, you have missed your TB medication. Please take your dose and contact your healthcare provider.`
      });
    }
  }
});

// Dose reminder for next day
cron.schedule('0 20 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const patients = await Patient.find({ status: 'Active' });
  for (const patient of patients) {
    const logExists = await TreatmentLog.findOne({ patient: patient._id, date: tomorrow });
    if (!logExists) {
      await transporter.sendMail({
        to: patient.email,
        subject: 'TB Treatment Reminder',
        text: `Reminder: Please take your TB medication tomorrow.`
      });
    }
  }
});