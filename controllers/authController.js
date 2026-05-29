const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.getLogin = (req, res) => {
  res.render('auth/login', { error: null, layout: false });
};

// Refactored to redirect with query params instead of rendering login page again
exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.redirect('/login?error=Invalid credentials');
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.redirect('/login?error=Invalid credentials');
    }
    // success
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    req.session.preferredExportFormat = user.preferredExportFormat || 'pdf'; // store preferred export format in session
    // const userRecord = await User.findById(user._id);
    // req.session.preferredExportFormat = userRecord.preferredExportFormat;
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/login?error=Server error, try again');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/login');
  });
};
