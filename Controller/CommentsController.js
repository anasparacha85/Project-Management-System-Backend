const Comment = require("../Modal/CommentsModal");
const SubTask = require("../Modal/SubTaskModal");
const Task = require("../Modal/TaskModal");


const addComment = async (req, res) => {
  try {
    const { type, targetId, content } = req.body;
    const createdBy=req.user._id
    if (!["task", "subtask"].includes(type)) {
      return res.status(400).json({ message: "Invalid type provided" });
    }

    // ✅ Check target existence dynamically
    const Model = type === "task" ? Task : SubTask;
    const target = await Model.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: `${type} not found` });
    }

    // ✅ Create and save comment
    const newComment = new Comment({
      content,
      createdBy,
      [type==='task'?'task':'subTask']: targetId,
    });

    await newComment.save();
    target.comments.push(newComment._id)
    await target.save()
    const populatedComment = await Comment.findById(newComment._id).populate("createdBy", "name email");

  return  res.status(201).json({
      success: true,
      message: `Comment added to ${type}`,
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
   return res.status(500).json({ message: "Server error", error: error.message });
  }
};
const getAllCommentsByTargets = async (req, res) => {
  try {
    const { type, targetId } = req.params;

    // Validate type
    if (!["task", "subtask"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    // Capital T fix
    const field = type === "task" ? "task" : "subTask";

    const comments = await Comment.find({ [field]: targetId })
      .populate("createdBy", "name email  avatarUrl")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Fetch comments error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports={addComment,getAllCommentsByTargets}