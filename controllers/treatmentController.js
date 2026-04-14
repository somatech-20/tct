const TreatmentLog = require('../models/TreatmentLog');
const Patient = require('../models/Patient');

exports.newForm = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).send('Patient not found');
    res.render('treatments/logForm', { patient, log: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.create = async (req, res) => {
  try {
    const logData = { ...req.body, patient: req.params.patientId };
    const log = new TreatmentLog(logData);
    await log.save();
    res.redirect(`/patients/${req.params.patientId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.editForm = async (req, res) => {
  try {
    const log = await TreatmentLog.findById(req.params.logId);
    if (!log) return res.status(404).send('Log not found');
    const patient = await Patient.findById(log.patient);
    res.render('treatments/logForm', { patient, log });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.update = async (req, res) => {
  try {
    await TreatmentLog.findByIdAndUpdate(req.params.logId, req.body);
    res.redirect(`/patients/${req.params.patientId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.delete = async (req, res) => {
  try {
    await TreatmentLog.findByIdAndDelete(req.params.logId);
    res.redirect(`/patients/${req.params.patientId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
