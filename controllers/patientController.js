const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const Contact = require('../models/Contact');
const json2csv = require('json2csv').parse;
const ExcelJS = require('exceljs');

exports.exportCSV = async (req, res) => {
  const patients = await Patient.find().lean();
  const fields = ['fullName', 'age', 'gender', 'tbType', 'status', 'treatmentStartDate'];
  const csv = json2csv(patients, { fields });
  res.header('Content-Type', 'text/csv');
  res.attachment('patients.csv');
  res.send(csv);
};

exports.exportExcel = async (req, res) => {
  const patients = await Patient.find().lean();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Patients');
  worksheet.columns = [
    { header: 'Name', key: 'fullName', width: 30 },
    { header: 'Age', key: 'age', width: 10 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'TB Type', key: 'tbType', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Start Date', key: 'treatmentStartDate', width: 15 }
  ];
  worksheet.addRows(patients);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=patients.xlsx');
  await workbook.xlsx.write(res);
  res.end();
};

exports.list = async (req, res) => {
  try {
    const patients = await Patient.find().sort('-createdAt');
    res.render('patients/list', { patients });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.detail = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).send('Patient not found');
    const treatments = await TreatmentLog.find({ patient: patient._id }).sort('-date');
    const contacts = await Contact.find({ patient: patient._id });
    res.render('patients/detail', { patient, treatments, contacts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.newForm = (req, res) => {
  res.render('patients/form', { patient: null });
};

exports.create = async (req, res) => {
  try {
    const patientData = { ...req.body, createdBy: req.session.userId };
    const patient = new Patient(patientData);
    await patient.save();
    res.redirect(`/patients/${patient._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.editForm = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).send('Patient not found');
    res.render('patients/form', { patient });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.update = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) return res.status(404).send('Patient not found');
    res.redirect(`/patients/${patient._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.delete = async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    await TreatmentLog.deleteMany({ patient: req.params.id });
    await Contact.deleteMany({ patient: req.params.id });
    res.redirect('/patients');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
