const cron = require('node-cron');
const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const transporter = require('../config/email');

/**
 * Send reminder email
 */
const sendReminderEmail = async (patient, message) => {
  try {
    await transporter.sendMail({
      to: patient.email,
      subject: 'TB Treatment Reminder',
      text: message,
    });

    console.log(`Reminder sent to ${patient.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${patient.email}`, error);
  }
};

/**
 * DAILY MISSED DOSE CHECK
 * Runs every day at 9 AM
 */
const dailyReminder = async () => {
  try {
    const today = new Date();

    const twoDaysAgo = new Date(
      today.getTime() - 2 * 24 * 60 * 60 * 1000
    );

    const patients = await Patient.find({
      status: 'Active',
    }).lean();

    for (const patient of patients) {
      const lastLog = await TreatmentLog.findOne({
        patient: patient._id,
      }).sort({ date: -1 });

      // Patient missed medication for 2+ days
      if (!lastLog || lastLog.date < twoDaysAgo) {

        // OPTIONAL:
        // prevent duplicate reminders within 24 hours

        if (
          patient.lastReminderSent &&
          new Date(patient.lastReminderSent) >
            new Date(today.getTime() - 24 * 60 * 60 * 1000)
        ) {
          continue;
        }

        await sendReminderEmail(
          patient,
          `Dear ${patient.fullName}, you have missed your TB medication for more than 2 days. Please take your dose and contact your healthcare provider.`
        );

        // save last reminder timestamp
        await Patient.findByIdAndUpdate(patient._id, {
          lastReminderSent: new Date(),
        });
      }
    }

    console.log('Daily reminder job completed');
  } catch (error) {
    console.error('Daily reminder cron failed:', error);
  }
};

/**
 * NEXT DAY REMINDER
 * Runs every day at 8 PM
 */
const nextDayReminder = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // start/end of tomorrow
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);

    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const patients = await Patient.find({
      status: 'Active',
    }).lean();

    for (const patient of patients) {
      const logExists = await TreatmentLog.findOne({
        patient: patient._id,
        date: {
          $gte: start,
          $lte: end,
        },
      });

      if (!logExists) {
        await sendReminderEmail(
          patient,
          `Reminder: Please take your TB medication tomorrow.`
        );
      }
    }

    console.log('Next-day reminder job completed');
  } catch (error) {
    console.error('Next-day reminder cron failed:', error);
  }
};

/**
 * CRON SCHEDULERS
 */

// Daily missed-dose check at 9:00 AM
cron.schedule('0 9 * * *', dailyReminder, {
  timezone: 'Africa/Mogadishu',
});

// Next-day reminder at 8:00 PM
cron.schedule('0 20 * * *', nextDayReminder, {
  timezone: 'Africa/Mogadishu',
});

module.exports = {
  dailyReminder,
  nextDayReminder,
};