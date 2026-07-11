const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.getLogin = (req, res) => {
  res.render('auth/login', { error: null, layout: false });
};

// Handle login form submission
exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.render('auth/login', { error: 'Invalid credentials', layout: false });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('auth/login', { error: 'Invalid credentials', layout: false });
    }
    
    // Set session values
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    req.session.preferredExportFormat = user.preferredExportFormat || 'pdf';
    
    // Save session explicitly
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.redirect('/dashboard');
    });
  } catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Server error, try again', layout: false });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/login');
  });
};
