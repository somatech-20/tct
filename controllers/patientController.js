const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const Contact = require('../models/Contact');
const json2csv = require('json2csv').parse;
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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

exports.exportPDF = async (req, res) => {
  try {
    const patients = await Patient.find().lean();
    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=patients.pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('TB Patients Report', { align: 'center' });
    doc.moveDown();

    // Table headers
    const startX = 30;
    let y = doc.y;
    doc.fontSize(10);
    doc.text('Name', startX, y);
    doc.text('Age/Gender', startX + 150, y);
    doc.text('TB Type', startX + 250, y);
    doc.text('Status', startX + 350, y);
    doc.moveDown();
    y = doc.y;
    doc.moveTo(startX, y).lineTo(startX + 500, y).stroke();

    // Rows
    patients.forEach(p => {
      doc.text(p.fullName, startX, doc.y);
      doc.text(`${p.age} / ${p.gender}`, startX + 150, doc.y - 12);
      doc.text(p.tbType, startX + 250, doc.y - 12);
      doc.text(p.status, startX + 350, doc.y - 12);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('PDF generation failed');
  }
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
