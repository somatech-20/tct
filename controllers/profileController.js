const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.show = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.render('profile/index', { user, error: null, success: req.query.success });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.session.userId);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.render('profile/index', { user, error: 'Current password is incorrect', success: null });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    res.redirect('/profile?success=Password updated successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};