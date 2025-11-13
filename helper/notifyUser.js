const Notification = require("../Modal/NotificationModal");

const User = require("../Modal/User");
const { getIO } = require("../socket/socket");
const sendEmail = require("../utils/sendMailutils");

const notifyUser = async ({ type, message, recipientId, project, task, subTask }) => {
  try {
    const notification = await Notification.create({
      type,
      message,
      recipient: recipientId,
      relatedProject: project,
      relatedTask: task,
      relatedSubTask: subTask,
    });

    // 🔔 Real-time emit
    const io = getIO();
    if (io) io.to(recipientId.toString()).emit("new-notification", notification);

    // 📧 Send Email
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && recipientUser.email) {
      await sendEmail({
        to: recipientUser.email,
        subject: "New Notification - Project Management System",
        html: `<p>${message}</p>`,
      });
    }

    return notification;
  } catch (err) {
    console.error("❌ Notification Error:", err);
  }
};

module.exports = { notifyUser };
