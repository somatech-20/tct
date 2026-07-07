const Patient = require('../models/Patient');
const TreatmentLog = require('../models/TreatmentLog');
const Contact = require('../models/Contact');
const json2csv = require('json2csv').parse;
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const User = require('../models/User');

exports.exportCSV = async (req, res) => {
  const patients = await Patient.find().lean();
  const fields = ['fullName', 'email', 'phone', 'address', 'age', 'gender', 'tbType', 'status', 'treatmentStartDate'];
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
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 50 },
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

// Rather *landscape PDF export all patients w email and phone.
exports.exportPDF = async (req, res) => {
  try {
    const patients = await Patient.find().lean();

    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      layout: 'landscape'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=patients.pdf'
    );

    doc.pipe(res);

    const startX = 30;
    const tableWidth = 760;

    // Report Header
    doc
      .fontSize(22)
      .fillColor('#2C3E50')
      .text('TB Patients Report', {
        align: 'center'
      });

    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(
        `Generated: ${new Date().toLocaleString()}`,
        {
          align: 'center'
        }
      );

    doc.moveDown(2);

    // Table Header
    const drawTableHeader = (y) => {
      doc
        .rect(startX, y, 760, 22)
        .fill('#2C3E50');

      doc
        .fillColor('#FFFFFF')
        .fontSize(10);

      doc.text('Name', 35, y + 6, { width: 120 });
      doc.text('Phone', 160, y + 6, { width: 100 });
      doc.text('Email', 265, y + 6, { width: 180 });
      doc.text('Age/Gender', 450, y + 6, { width: 80 });
      doc.text('TB Type', 540, y + 6, { width: 100 });
      doc.text('Status', 650, y + 6, { width: 80 });

      doc.fillColor('#000000');

      return y + 28;
    };

    // Table Row
    const drawRow = (patient, y) => {
      doc.fontSize(9);

      doc.text(
        patient.fullName || '-',
        35,
        y,
        { width: 120 }
      );

      doc.text(
        patient.phone || '-',
        160,
        y,
        { width: 100 }
      );

      doc.text(
        patient.email || '-',
        265,
        y,
        { width: 180 }
      );

      doc.text(
        `${patient.age || '-'} / ${patient.gender || '-'}`,
        450,
        y,
        { width: 80 }
      );

      doc.text(
        patient.tbType || '-',
        540,
        y,
        { width: 100 }
      );

      doc.text(
        patient.status || '-',
        650,
        y,
        { width: 80 }
      );
    };

    let y = drawTableHeader(doc.y);

    // Patient Rows
    patients.forEach((patient, index) => {
      // page break
      if (y > 740) {
        doc.addPage();
        y = drawTableHeader(30);
      }

      // zebra stripe
      if (index % 2 === 0) {
        doc
          .rect(startX, y - 2, tableWidth, 20)
          .fill('#F5F5F5');

        doc.fillColor('#000000');
      }

      drawRow(patient, y);

      y += 22;
    });

    // Footer
    doc.moveTo(startX, y + 10)
      .lineTo(startX + tableWidth, y + 10)
      .strokeColor('#CCCCCC')
      .stroke();

    doc
      .fontSize(9)
      .fillColor('#666666')
      .text(
        `Total Patients: ${patients.length}`,
        startX,
        y + 20
      );

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('PDF generation failed');
  }
};

exports.exportOne = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) return res.status(404).send('Patient not found');
    const treatments = await TreatmentLog.find({ patient: patient._id }).lean();
    const contacts = await Contact.find({ patient: patient._id }).lean();

    // const format = req.session.preferredExportFormat || 'pdf'; // from session
    const format =
      req.session &&
        req.session.preferredExportFormat
        ? req.session.preferredExportFormat
        : 'pdf';

    if (format === 'csv') {
      const combined = [{ ...patient, treatments: JSON.stringify(treatments), contacts: JSON.stringify(contacts) }];
      const csv = json2csv(combined);
      res.header('Content-Type', 'text/csv');
      res.attachment(`patient_${patient._id}.csv`);
      return res.send(csv);
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Patient');
      ws.addRows([patient]);
      // Add separate sheets for treatments and contacts
      const wsTreat = workbook.addWorksheet('Treatments');
      wsTreat.addRows(treatments);
      const wsCont = workbook.addWorksheet('Contacts');
      wsCont.addRows(contacts);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=patient_${patient._id}.xlsx`);
      return workbook.xlsx.write(res).then(() => res.end());
    }

    // Default PDF
    const doc = new PDFDocument({
      margin: 30,
      size: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=patient_${patient._id}.pdf`
    );

    doc.pipe(res);

    // HEADER
    doc.rect(0, 0, doc.page.width, 80)
      .fill('#2C3E50');

    doc
      .fillColor('#FFFFFF')
      .fontSize(24)
      .text('TB Patient Report', 0, 28, {
        align: 'center'
      });

    doc
      .fontSize(10)
      .text(
        `Generated: ${new Date().toLocaleString()}`,
        0,
        58,
        { align: 'center' }
      );

    let y = 110;

    // SUMMARY CARD
    doc
      .roundedRect(30, y, 250, 95, 5)
      .stroke('#2C3E50');

    doc
      .fillColor('#2C3E50')
      .fontSize(14)
      .text('Patient Summary', 45, y + 12);

    doc
      .fillColor('black')
      .fontSize(11);

    doc.text(`Name: ${patient.fullName}`, 45, y + 38);
    doc.text(`Phone: ${patient.phone || 'N/A'}`, 45, y + 58);
    doc.text(`Status: ${patient.status}`, 45, y + 78);

    // DETAILS CAR
    const detailX = 310;
    const detailWidth = 255;

    doc
      .roundedRect(detailX, y, detailWidth, 160, 5)
      .stroke('#D0D0D0');

    doc
      .fillColor('#2C3E50')
      .fontSize(14)
      .text('Patient Details', detailX + 15, y + 12);

    const details = [
      ['Email', patient.email || 'N/A'],
      ['Age', patient.age],
      ['Gender', patient.gender],
      ['Address', patient.address],
      ['TB Type', patient.tbType],
      [
        'Treatment Start',
        new Date(patient.treatmentStartDate).toDateString()
      ]
    ];

    let detailY = y + 40;

    details.forEach(([label, value]) => {
      doc
        .fillColor('#666')
        .fontSize(10)
        .text(label, detailX + 15, detailY);

      doc
        .fillColor('#000')
        .fontSize(11)
        .text(String(value), detailX + 110, detailY);

      detailY += 20;
    });

    // TREATMENT LOGS
    y = 300;

    doc
      .fillColor('#2C3E50')
      .fontSize(18)
      .text('Treatment Logs', 30, y);

    y += 30;

    if (treatments.length === 0) {
      doc
        .fontSize(11)
        .fillColor('#666')
        .text('No treatment logs available.', 30, y);

      y += 20;
    } else {
      treatments.forEach((log, index) => {
        doc
          .rect(30, y - 3, 535, 22)
          .fill(index % 2 === 0 ? '#F8F9FA' : '#FFFFFF');

        doc.fillColor('black');

        doc.text(
          `${new Date(log.date).toDateString()}  |  Dose Taken: ${log.doseTaken ? 'Yes' : 'No'
          }  |  Sputum: ${log.sputumResult}`,
          40,
          y + 3
        );

        y += 24;
      });
    }

    // CONTACTS
    y += 30;

    doc
      .fillColor('#2C3E50')
      .fontSize(18)
      .text('Contacts', 30, y);

    y += 30;

    if (contacts.length === 0) {
      doc
        .fontSize(11)
        .fillColor('#666')
        .text('No contacts recorded.', 30, y);
    } else {
      contacts.forEach((contact, index) => {
        doc
          .rect(30, y - 3, 535, 22)
          .fill(index % 2 === 0 ? '#F8F9FA' : '#FFFFFF');

        doc.fillColor('black');

        doc.text(
          `${contact.fullName} (${contact.relationship}) | Screened: ${new Date(contact.screeningDate).toDateString()
          } | Status: ${contact.screeningStatus}`,
          40,
          y + 3
        );

        y += 24;
      });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Export failed');
  }
};

// exports.list = async (req, res) => {
//   try {
//     const patients = await Patient.find().sort('-createdAt');
//     res.render('patients/list', { patients });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// };

// List - populate assignedDoctor and registeredBy
exports.list = async (req, res) => {
  try {
    const { search, status, district, returnee } = req.query;
    const filter = {};

    // Status filter
    if (status && status !== '') {
      filter.status = status;
    }

    // District filter
    if (district && district !== '') {
      filter.district = district;
    }

    // Returnee filter
    if (returnee && returnee !== '') {
      filter.isReturnee = returnee === 'true';
    }

    // Search filter (name, phone, email)
    if (search && search !== '') {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(filter)
      .sort('-createdAt')
      .populate('assignedDoctor', 'username fullName')
      .populate('registeredBy', 'username fullName')
      .populate('createdBy', 'username fullName');

    res.render('patients/list', { patients, query: req.query });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Detail - already updated earlier
exports.detail = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('assignedDoctor', 'username fullName')
      .populate('registeredBy', 'username fullName')
      .populate('createdBy', 'username fullName');
      
    if (!patient) return res.status(404).send('Patient not found');
    
    const treatments = await TreatmentLog.find({ patient: patient._id }).sort('-date');
    const contacts = await Contact.find({ patient: patient._id });
    
    res.render('patients/detail', { patient, treatments, contacts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// exports.detail = async (req, res) => {
//   try {
//     const patient = await Patient.findById(req.params.id);
//     if (!patient) return res.status(404).send('Patient not found');
//     const treatments = await TreatmentLog.find({ patient: patient._id }).sort('-date');
//     const contacts = await Contact.find({ patient: patient._id });
//     res.render('patients/detail', { patient, treatments, contacts });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// };

exports.newForm = async (req, res) => {
  try {
    // Allowin doctor or receptionist
    if (req.session.userRole !== 'doctor' && req.session.userRole !== 'receptionist') {
      return res.status(403).send('Access denied. Only doctors and receptionists can add patients.');
    }
    const doctors = await User.find({ role: 'doctor' }).select('username fullName');
    res.render('patients/form', { patient: null, doctors });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// exports.create = async (req, res) => {
//   try {
//     if (req.session.userRole !== 'doctor' && req.session.userRole !== 'receptionist') {
//       return res.status(403).send('Access denied. Only doctors and receptionists can register patients.');
//     }
//     const patientData = { ...req.body, createdBy: req.session.userId, registeredBy: req.session.userId };
//     const patient = new Patient(patientData);
//     await patient.save();
//     res.redirect(`/patients/${patient._id}`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// };

// exports.update = async (req, res) => {
//   try {
//     // Allow receptionists to update patient info, and doctors can update treatment info
//     // For now, we'll allow both roles to update basic patient data
//     const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!patient) return res.status(404).send('Patient not found');
//     res.redirect(`/patients/${patient._id}`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// };

exports.create = async (req, res) => {
  try {
    // Only receptionists can create patients
    if (req.session.userRole !== 'receptionist' && req.session.userRole !== 'doctor') {
      return res.status(403).send('Only receptionists and doctors can register patients.');
    }

    // Extract emergency contact from form data
    const patientData = {
      ...req.body,
      registeredBy: req.session.userId,
      createdBy: req.session.userId,
      // Ensure emergencyContact is properly structured
      emergencyContact: {
        name: req.body.emergencyContact?.name || '',
        relationship: req.body.emergencyContact?.relationship || '',
        phone: req.body.emergencyContact?.phone || ''
      }
    };

    // Remove any empty emergency contact fields
    if (!patientData.emergencyContact.name && 
        !patientData.emergencyContact.relationship && 
        !patientData.emergencyContact.phone) {
      patientData.emergencyContact = undefined;
    }

    const patient = new Patient(patientData);
    await patient.save();
    res.redirect(`/patients/${patient._id}`);
  } catch (err) {
    console.error(err);
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).send('A patient with this name already exists. Please use a different name.');
    }
    res.status(500).send('Server Error');
  }
};

exports.update = async (req, res) => {
  try {
    // Check permission
    if (req.session.userRole !== 'receptionist' && req.session.userRole !== 'admin' && req.session.userRole !== 'doctor') {
      return res.status(403).send('Access denied. Insufficient privileges.');
    }

    // Prepare update data
    const updateData = {
      fullName: req.body.fullName,
      age: req.body.age,
      gender: req.body.gender,
      maritalStatus: req.body.maritalStatus || undefined,
      district: req.body.district,
      tbType: req.body.tbType,
      treatmentStartDate: req.body.treatmentStartDate,
      status: req.body.status || 'Active',
      isReturnee: req.body.isReturnee === 'true' || req.body.isReturnee === true,
      previousTreatmentDate: req.body.previousTreatmentDate || undefined,
      email: req.body.email || undefined,
      phone: req.body.phone || undefined,
      // assignedDoctor - handle empty string
      assignedDoctor: req.body.assignedDoctor && req.body.assignedDoctor !== '' ? req.body.assignedDoctor : undefined,
      emergencyContact: {
        name: req.body.emergencyContact?.name || '',
        relationship: req.body.emergencyContact?.relationship || '',
        phone: req.body.emergencyContact?.phone || ''
      }
    };

    // Remove empty emergency contact
    if (!updateData.emergencyContact.name && 
        !updateData.emergencyContact.relationship && 
        !updateData.emergencyContact.phone) {
      updateData.emergencyContact = undefined;
    }

    // Remove _id from update data if present
    delete updateData._id;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!patient) return res.status(404).send('Patient not found');
    
    res.redirect(`/patients/${patient._id}`);
  } catch (err) {
    console.error('Update error:', err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ msg: e.message }));
      const doctors = await User.find({ role: 'doctor' }).select('username fullName');
      return res.status(400).render('patients/form', {
        patient: req.body,
        doctors: doctors,
        errors: errors,
        action: `/patients/${req.params.id}?_method=PUT`
      });
    }
    
    if (err.code === 11000) {
      const doctors = await User.find({ role: 'doctor' }).select('username fullName');
      return res.status(400).render('patients/form', {
        patient: req.body,
        doctors: doctors,
        errors: [{ msg: 'A patient with this name already exists. Please use a different name.' }],
        action: `/patients/${req.params.id}?_method=PUT`
      });
    }
    
    res.status(500).send('Server Error');
  }
};

exports.editForm = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('assignedDoctor');
    if (!patient) return res.status(404).send('Patient not found');
    const doctors = await User.find({ role: 'doctor' }).select('username fullName');
    res.render('patients/form', { 
      patient, 
      doctors,
      action: `/patients/${patient._id}?_method=PUT`
    });
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
