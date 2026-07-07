const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');

exports.index = async (req, res) => {
  try {
    let filter = {};
    
    // If receptionist, only show patients they registered
    if (req.session.userRole === 'receptionist') {
      filter.registeredBy = req.session.userId;
    }

    const totalActive = await Patient.countDocuments({ ...filter, status: 'Active' });
    const recovered = await Patient.countDocuments({ ...filter, status: 'Recovered' });
    const defaulters = await Patient.countDocuments({ ...filter, status: 'Defaulted' });
    const totalPatients = await Patient.countDocuments(filter);

    // Missed doses in last 7 days (for all patients, or filter by assigned doctor if doctor)
    let missedDosesFilter = {};
    if (req.session.userRole === 'doctor') {
      missedDosesFilter = { assignedDoctor: req.session.userId };
    } else if (req.session.userRole === 'receptionist') {
      missedDosesFilter = { registeredBy: req.session.userId };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const patientsWithMissedDoses = await Patient.find(missedDosesFilter).select('_id');
    const patientIds = patientsWithMissedDoses.map(p => p._id);
    
    const missedDoses = await TreatmentLog.countDocuments({
      patient: { $in: patientIds },
      doseTaken: false,
      date: { $gte: sevenDaysAgo }
    });

    res.render('dashboard/index', {
      totalActive,
      recovered,
      defaulters,
      totalPatients,
      missedDoses,
      role: req.session.userRole
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
