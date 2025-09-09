const mongoose = require("mongoose");

const subTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  // Reference to parent Task (Milestone)
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },

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

  status: {
    type: String,
    enum: ["todo", "in-progress", "review", "completed"],
    default: "todo",
  },

  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },

  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date },

  progress: { type: Number, default: 0 },
  attachments:[ {
        filename: String,
        url: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dependencies:[{type:mongoose.Schema.Types.ObjectId,ref:"SubTask"}]
}, { timestamps: true });

const SubTask =new  mongoose.model("SubTask", subTaskSchema);
module.exports = SubTask;
