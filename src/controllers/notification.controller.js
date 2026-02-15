const Notification = require('../models/Notification');

/* ===========================
   GET MY NOTIFICATIONS
=========================== */
exports.getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({
    recipient_id: req.user.id,
  }).sort({ createdAt: -1 });

  res.json(notifications);
};

/* ===========================
   MARK AS READ
=========================== */
exports.markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  await Notification.findByIdAndUpdate(notificationId, {
    read: true,
  });

  res.json({ message: 'Notification marked as read' });
};
