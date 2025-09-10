const mongoose = require("mongoose");

const timeLogSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
  subTask: { type: mongoose.Schema.Types.ObjectId, ref: "SubTask" },

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Time Tracking
  startTime: { type: Date, required: true },
  endTime: { type: Date }, // null until stopped
  duration: { type: Number, default: 0 }, // store in minutes or hours

  // Action Log
  action: {
    type: String,
    enum: ["started", "paused", "resumed", "completed"],
    default: "started"
  },

  notes: { type: String }, // optional notes for work session
}, { timestamps: true });

const TimeLog = mongoose.model("TimeLog", timeLogSchema);
module.exports = TimeLog;
