const Notification = require("../Modal/NotificationModal");
const { User } = require("../Modal/User");
const { getIO } = require("../socket/socket");
const sendEmail = require("../utils/sendMailutils");

const notifyUser = async ({ type, message, recipientId, project, task, subTask, title, link, emailLink ,userImage}) => {
  try {
    // ✅ Create notification in DB
    const notification = await Notification.create({
      type,
      message,
      title,
      recipient: recipientId,
      relatedProject: project,
      relatedTask: task,
      relatedSubTask: subTask,
      link, // frontend navigation link
    });

    // 🔔 Real-time emit to user's room if online
    const io = getIO();
    const room = recipientId && recipientId.toString();
    if (io && room) {
      io.to(room).emit("new-notification", {
        _id: notification._id,
        type,
        title,
        message,
        createdAt: notification.createdAt,
        isRead: notification.isRead,
        link: notification.link,
        userImage
      });
    }

    // 📧 Send professional email
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && recipientUser.email) {
      const htmlEmail = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px;">${title || "New Notification"}</h2>
          </div>
          <div style="padding: 20px; color: #333;">
            <p style="font-size: 16px; line-height: 1.5;">${message}</p>
            <p style="text-align: center; margin-top: 30px;">
              <a href="${emailLink}" style="background-color: #4f46e5; color: white; padding: 12px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                View Task
              </a>
            </p>
            <p style="font-size: 12px; color: #888; margin-top: 20px;">If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #555; word-break: break-all;">${emailLink}</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: recipientUser.email,
        subject: title || "New Notification - Project Management System",
        html: htmlEmail,
      });
    }

    return notification;
  } catch (err) {
    console.error("❌ Notification Error:", err);
  }
};

module.exports = { notifyUser };
