const Notification = require('../models/Notification');
const { getIO } = require('../socket');

module.exports = async ({
  recipient_id,
  recipient_model,
  title,
  message,
}) => {
  // Save in DB
  const notification = await Notification.create({
    recipient_id,
    recipient_model,
    title,
    message,
  });

  // Emit real-time
  try {
    const io = getIO();
    io.to(recipient_id.toString()).emit('notification', notification);
  } catch (err) {
    console.log('Socket emit skipped:', err.message);
  }

  return notification;
};
