const mongoose=require('mongoose')

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  },
  subTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubTask",
  },
  attachments: [
    {
      filename: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model("Comment", commentSchema);
module.exports=Comment