const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true }, // optional but good for search
    description: { type: String },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true, // 🔥 MOST Important
    },

    assignees: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          index: true, // 🔥 Multi-key index
        },
        status: {
          type: String,
          enum: ["todo", "in-progress", "review", "completed"],
          default: "todo",
        },
        completedAt: { type: Date },
      },
    ],

    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "completed"],
      default: "todo",
      index: true, // 🔥 Filtering fast
    },

    progress: { type: Number, default: 0 },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
      index: true, // optional but good
    },

    startDate: { type: Date, default: null, index: true }, // 🔥 For date range filtering
    dueDate: { type: Date, default: null, index: true },

    attachments: [
      {
        filename: String,
        url: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    subTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubTask" }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 🔥 useful for filtering
    },

    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true }
);

// Additional compound indexes for very fast performance:
taskSchema.index({ project: 1, status: 1 });  // 🔥 filter tasks by project + status
taskSchema.index({ project: 1, priority: 1 });
taskSchema.index({ createdAt: -1 });         // 🔥 sort newest tasks fast
taskSchema.index({ "assignees.user": 1, status: 1 }); // 🔥 tasks assigned to user + status

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;
