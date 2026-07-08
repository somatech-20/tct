const Notification = require('../models/Notification');

// Get all notifications for current user
exports.index = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.session.userId })
      .sort('-createdAt')
      .populate('relatedPatient', 'fullName patientId');
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    res.render('notifications/index', { 
      notifications, 
      unreadCount 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Get unread count (API)
exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.session.userId, 
      read: false 
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Get recent notifications (API)
exports.recent = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.session.userId })
      .sort('-createdAt')
      .limit(10)
      .populate('relatedPatient', 'fullName patientId');
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Mark notification as read
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.session.userId
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Mark all as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.session.userId, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};