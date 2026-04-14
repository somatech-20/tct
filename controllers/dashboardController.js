const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');

exports.index = async (req, res) => {
  try {
    const totalActive = await Patient.countDocuments({ status: 'Active' });
    const recovered = await Patient.countDocuments({ status: 'Recovered' });
    const defaulters = await Patient.countDocuments({ status: 'Defaulted' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const missedDoses = await TreatmentLog.countDocuments({
      doseTaken: false,
      date: { $gte: sevenDaysAgo }
    });

    res.render('dashboard/index', {
      totalActive,
      recovered,
      defaulters,
      missedDoses
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
