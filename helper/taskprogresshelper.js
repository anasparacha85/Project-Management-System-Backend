const Task = require("../Modal/TaskModal");
const updateProjectProgress = require('./projrectprogresshelper')

const updateTaskProgress = async (taskId) => {
  const task = await Task.findById(taskId).populate("subTasks");
  if (!task) return;

  if (task.subTasks && task.subTasks.length > 0) {
    const total = task.subTasks.length;
    const completedCount = task.subTasks.filter(st => st.status === "completed").length;
    const reviewCount = task.subTasks.filter(st => st.status === "review").length;
    const inProgressCount = task.subTasks.filter(st => st.status === "in-progress").length;

    task.progress = Math.round((completedCount / total) * 100);

    if (completedCount === total) {
      task.status = "completed";
    } else if (reviewCount > 0) {
      task.status = "review";
    } else if (inProgressCount > 0 || completedCount > 0) {
      task.status = "in-progress";
    } else {
      task.status = "todo";
    }
  } else {
    const statusProgressMap = {
      "todo": 0,
      "in-progress": 35,
      "review": 70,
      "completed": 100,
    };
    task.progress = statusProgressMap[task.status] || 0;
  }

  await task.save();

  // Cascade → update parent Project
  if (task.project) {
    await updateProjectProgress(task.project);
  }
};

module.exports = updateTaskProgress;
