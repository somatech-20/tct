const cron = require('node-cron');
const Notification = require('../models/Notification');
const User = require('../models/User');
const transporter = require('../config/email');

/**
 * Send email for unread notifications older than 24 hours
 * Runs daily at 10:00 AM
 */
const notificationEmailReminder = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Find unread notifications older than 24 hours
    const oldNotifications = await Notification.find({
      read: false,
      createdAt: { $lte: yesterday }
    }).populate('user', 'username email');
    
    if (oldNotifications.length === 0) {
      console.log('No old notifications to remind');
      return;
    }
    
    // Group by user
    const userGroups = {};
    oldNotifications.forEach(n => {
      const userId = n.user._id.toString();
      if (!userGroups[userId]) {
        userGroups[userId] = {
          user: n.user,
          notifications: []
        };
      }
      userGroups[userId].notifications.push(n);
    });
    
    // Send email to each user
    for (const [userId, group] of Object.entries(userGroups)) {
      const { user, notifications } = group;
      
      if (!user.email) continue;
      
      const notificationList = notifications.map(n => {
        return `- ${n.title}: ${n.message}`;
      }).join('\n');
      
      const emailContent = `
Dear ${user.fullName || user.username},

You have ${notifications.length} unread notification(s) waiting for you:

${notificationList}

Please log in to view them:
${process.env.BASE_URL || 'https://tct-2zn2.onrender.com'}/notifications

This is an automated reminder. Please check your notifications regularly.
      `;
      
      try {
        await transporter.sendMail({
          to: user.email,
          subject: `[TB Case Tracer] ${notifications.length} Unread Notification(s)`,
          text: emailContent
        });
        console.log(`Email reminder sent to ${user.email}`);
      } catch (err) {
        console.error(`Failed to send email to ${user.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Notification email reminder failed:', err);
  }
};

// Schedule: Run daily at 10:00 AM (Africa/Mogadishu time)
cron.schedule('0 10 * * *', notificationEmailReminder, {
  timezone: 'Africa/Mogadishu'
});

module.exports = { notificationEmailReminder };