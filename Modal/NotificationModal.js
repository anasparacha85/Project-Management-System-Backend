const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["comment", "task-assigned", "status-change", "attachment", "custom"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  relatedSubTask: { type: mongoose.Schema.Types.ObjectId, ref: "SubTask" },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
