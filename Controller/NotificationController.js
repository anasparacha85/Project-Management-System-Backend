const Notification = require("../Modal/NotificationModal");

const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ recipient: userId })
      .populate("relatedTask relatedSubTask relatedProject")
      .sort({ createdAt: -1 });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notifId } = req.params;
    await Notification.findByIdAndUpdate(notifId, { isRead: true });
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
module.exports={getUserNotifications,markAsRead}