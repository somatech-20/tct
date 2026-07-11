const User = require('../models/User');
const bcrypt = require('bcrypt');

// List all users
exports.list = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.render('users/list', { users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Show new user form
exports.newForm = (req, res) => {
  res.render('users/form', { formUser: null, error: null });
};

// Create a new user
exports.create = async (req, res) => {
  try {
    const { username, password, role, fullName, email } = req.body;
    const existing = await User.findOne({ username });
    if (existing) {
      return res.render('users/form', { formUser: null, error: 'Username already exists' });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).send('Invalid email format');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role, fullName, email });
    await newUser.save();
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Show edit user form
exports.editForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).send('User not found');
    res.render('users/form', { formUser: user, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Update user (username, role, password optional)
exports.update = async (req, res) => {
  try {
    const { username, role, password, fullName, email } = req.body;
    // check email format
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).send('Invalid email format');
    }
    const updateData = { username, role, fullName, email };
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await User.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Delete user
exports.delete = async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.session.userId) {
      return res.status(400).send('You cannot delete your own account');
    }
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};