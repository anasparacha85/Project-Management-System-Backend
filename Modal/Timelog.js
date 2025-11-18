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
  // NEW: Track if time is within office hours
  isWithinOfficeHours: {
    type: Boolean,
    default: true
  },
  
  // NEW: Billable hours (only office hours counted)
  billableHours: {
    type: Number,
    default: 0
  },
  
  // NEW: Reference to leave if applicable
  leave: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leave',
    default: null
  }
}, { timestamps: true });

const TimeLog = mongoose.model("TimeLog", timeLogSchema);
module.exports = TimeLog;
