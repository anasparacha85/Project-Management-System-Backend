const Task = require("../Modal/TaskModal");

const updateTaskProgress = async (taskId) => {
   const task = await Task.findById(taskId).populate("subTasks");
  if (!task) return;

  // Agar subtasks hain to unke basis par progress nikalo
  if (task.subTasks && task.subTasks.length > 0) {
    const completedCount = task.subTasks.filter(st => st.status === "completed").length;
    const progress = Math.round((completedCount / task.subTasks.length) * 100);
    task.progress = progress;
  } else {
    // Agar subtasks hi nahi hain to task ke apne status se progress nikalo
    switch (task.status) {
      case "todo":
        task.progress = 0;
        break;
      case "in-progress":
        task.progress = 35; // 👈 tum apni logic ke hisaab se ye value adjust kar sakte ho
        break;
      case "review":
        task.progress = 70;
        break;
      case "completed":
        task.progress = 100;
        break;
      default:
        task.progress = 0;
    }
  }

  await task.save();
};

module.exports = updateTaskProgress;
