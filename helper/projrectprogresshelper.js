const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");

const updateProjectProgress = async (projectId) => {
  const tasks = await Task.find({ project: projectId });

  if (tasks.length === 0) {
    await Project.findByIdAndUpdate(projectId, { progress: 0 });
    return;
  }
  
  // Sirf manager-completed tasks project progress me ginoge
  const completedTasks = tasks.filter(task => task.status === "completed").length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  await Project.findByIdAndUpdate(projectId, { progress });
};
module.exports=updateProjectProgress