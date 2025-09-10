const SubTask = require("../Modal/SubTaskModal");
const updateTaskProgress = require('./taskprogresshelper')

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

  // Cascade → update parent Task
  if (subtask.task) {
    await updateTaskProgress(subtask.task);
  }
};

module.exports = updateSubtaskProgress;
