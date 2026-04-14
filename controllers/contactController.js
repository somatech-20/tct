const Contact = require('../models/Contact');
const Patient = require('../models/Patient');

exports.newForm = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).send('Patient not found');
    res.render('contacts/form', { patient, contact: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.create = async (req, res) => {
  try {
    const contactData = { ...req.body, patient: req.params.patientId };
    const contact = new Contact(contactData);
    await contact.save();
    res.redirect(`/patients/${req.params.patientId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.editForm = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.contactId);
    if (!contact) return res.status(404).send('Contact not found');
    const patient = await Patient.findById(contact.patient);
    res.render('contacts/form', { patient, contact });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.update = async (req, res) => {
  try {
    await Contact.findByIdAndUpdate(req.params.contactId, req.body);
    res.redirect(`/patients/${req.params.patientId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.delete = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.contactId);
    res.redirect(`/patients/${req.params.patientId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
