const Notification = require("../Modal/NotificationModal");

const getUserNotifications = async (req, res) => {
  try {
    const  userId  = req.user._id;
   
    const notifications = await Notification.find({ recipient: userId })
      .populate("relatedTask relatedSubTask relatedProject")
      .sort({ createdAt: -1 });
      if(notifications.length===0){
        return res.status(409).json({ success: false, FailureMessage: "No notifications found" });
      }

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false,FailureMessage: "Server Error" });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { notifId } = req.params;
    console.log(notifId,"=======");
    
    await Notification.findByIdAndUpdate(notifId, { isRead: true });
    res.json({ success: true, SuccessMessage: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
module.exports={getUserNotifications,markAsRead}