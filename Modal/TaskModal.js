const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  
  // Multiple assignees with their status
  assignees: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["todo", "in-progress", "review", "completed"],
        default: "todo"
      },
      completedAt: { type: Date }
    }
  ],

  // Task overall status (manager controlled)
  status: {
    type: String,
    enum: ["todo", "in-progress", "review", "completed",],
    default: "todo",
  },

  // Task completion % (based on assignees' progress)
  progress: { type: Number, default: 0 },

  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },

  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date },

  attachments: [
    {
      filename: String,
      url: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],

  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],

  subTasks: [{type:mongoose.Schema.Types.ObjectId,ref:"Task"}],


  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  comments:[]

}, { timestamps: true });

const Task = new mongoose.model("Task", taskSchema);
module.exports = Task;
