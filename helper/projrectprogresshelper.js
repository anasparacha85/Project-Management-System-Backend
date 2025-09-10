const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");

const updateProjectProgress = async (projectId) => {
  const tasks = await Task.find({ project: projectId });

  if (tasks.length === 0) {
    await Project.findByIdAndUpdate(projectId, { progress: 0, projectStatus: "draft" });
    return;
  }

  const total = tasks.length;
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const reviewCount = tasks.filter(t => t.status === "review").length;
  const inProgressCount = tasks.filter(t => t.status === "in-progress").length;

  const progress = Math.round((completedCount / total) * 100);

  let projectStatus = "draft";

  if (completedCount === total) {
    projectStatus = "Completed";   // ✅ all done
  } else if (reviewCount > 0) {
    projectStatus = "active";      // 🔎 review running, so active
  } else if (inProgressCount > 0 || completedCount > 0) {
    projectStatus = "active";      // 🚀 work is ongoing
  } else {
    projectStatus = "draft";       // 📄 no work started
  }

  // "on Hold" and "archieve" should be manual only, not auto
  await Project.findByIdAndUpdate(projectId, { progress, projectStatus });
};

module.exports = updateProjectProgress;
