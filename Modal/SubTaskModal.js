const mongoose = require("mongoose");

const subTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true ,index:true},

  assignees: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User",index:true },
      status: {
        type: String,
        enum: ["todo", "in-progress", "review", "completed"],
        default: "todo"
      },
      completedAt: { type: Date }
    }
  ],

  status: {
    type: String,
    enum: ["todo", "in-progress", "review", "completed"],
    default: "todo",
  },

  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
    index: true
  },

  startDate: { type: Date, default: null,index:true },
  dueDate: { type: Date, default: null,index:true },

  progress: { type: Number, default: 0 },

  attachments: [
    {
      filename: String,
      url: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: Date.now },
    }
  ],

  timeLogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeLog"
    }
  ],

  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment"
    }
  ],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubTask" }]

}, { timestamps: true });


// 🔥 INDEXES — PERFORMANCE BOOST
subTaskSchema.index({ task: 1 });
subTaskSchema.index({ "assignees.user": 1 });
subTaskSchema.index({ status: 1 });
subTaskSchema.index({ createdBy: 1 });
subTaskSchema.index({ priority: 1 });
subTaskSchema.index({ startDate: 1 });
subTaskSchema.index({ dueDate: 1 });
subTaskSchema.index({ dependencies: 1 });

const SubTask = mongoose.model("SubTask", subTaskSchema);
module.exports = SubTask;
