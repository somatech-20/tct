const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.getLogin = (req, res) => {
  res.render('auth/login', { error: null, layout: false});
};

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
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/login');
  });
};
