const SubTask = require("../Modal/SubTaskModal");

// Subtask progress update function
// controller
const updateSubtaskProgress = async (subtaskId) => {
  const subtask = await SubTask.findById(subtaskId);
  if (!subtask) return;

  const statusProgressMap = {
    "todo": 0,
    "in-progress": 50,
    "review": 75,
    "completed": 100,
  };

  subtask.progress = statusProgressMap[subtask.status] || 0;
  await subtask.save();
};
module.exports=updateSubtaskProgress
