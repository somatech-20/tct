const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.show = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.render('profile/index', { user, error: null, suka: req.query.suka, success: req.query.success });
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
      return res.render('profile/index', { user, error: 'Current password is incorrect', suka: null });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    res.redirect('/profile?suka=Password updated successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.updateExportFormat = async (req, res) => {
  try {
    const { preferredExportFormat } = req.body;
    await User.findByIdAndUpdate(req.session.userId, { preferredExportFormat });
    req.session.preferredExportFormat = preferredExportFormat; // update session
    res.redirect('/profile?success=Export format updated');
  } catch (err) {
    console.error(err);
    res.redirect('/profile?error=Update failed');
  }
};