const Project = require("../models/Project");
const Task = require("../models/Task");
const SubTask = require("../models/SubTask");
const TimeLog = require("../models/TimeLog");
const mongoose = require("mongoose");

const getProjectEmployeeReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid projectId" });
    }

    // 🟢 Project + Team
    const project = await Project.findById(projectId).populate(
      "team.user",
      "name email avatarUrl"
    );
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // 🟡 Tasks for Project
    const tasks = await Task.find({ project: projectId }).populate(
      "assignees.user",
      "name email avatarUrl"
    );

    // 🟠 Subtasks -> project ke through tasks fetch karenge
    const taskIds = tasks.map((t) => t._id);
    const subtasks = await SubTask.find({ task: { $in: taskIds } }).populate(
      "assignees.user",
      "name email avatarUrl"
    );

    // 🔵 TimeLogs
    const logs = await TimeLog.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      {
        $group: {
          _id: "$user",
          totalMinutes: { $sum: "$duration" },
        },
      },
    ]);

    const logMap = {};
    logs.forEach((l) => {
      logMap[l._id.toString()] = l.totalMinutes;
    });

    // 🟣 Build Report
    const report = project.team.map((member) => {
      const userId = member.user._id.toString();

      // User Tasks
      const userTasks = tasks.filter((t) =>
        t.assignees.some(
          (a) => a.user && a.user._id.toString() === userId
        )
      );
      const completedTasks = userTasks.filter((t) => t.status === "completed");

      // User Subtasks
      const userSubTasks = subtasks.filter((st) =>
        st.assignees.some(
          (a) => a.user && a.user._id.toString() === userId
        )
      );
      const completedSubTasks = userSubTasks.filter(
        (st) => st.status === "completed"
      );

      // Time Spent
      const minutesSpent = logMap[userId] || 0;
      const hours = Math.floor(minutesSpent / 60);
      const mins = minutesSpent % 60;

      // Completion %
      const totalAssigned = userTasks.length + userSubTasks.length;
      const totalCompleted =
        completedTasks.length + completedSubTasks.length;
      const completionRate =
        totalAssigned > 0
          ? ((totalCompleted / totalAssigned) * 100).toFixed(1)
          : 0;

      return {
        employee: {
          id: member.user._id,
          name: member.user.name,
          email: member.user.email,
          avatar: member.user.avatarUrl,
          role: member.role,
        },
        stats: {
          tasksAssigned: userTasks.length,
          tasksCompleted: completedTasks.length,
          subtasksAssigned: userSubTasks.length,
          subtasksCompleted: completedSubTasks.length,
          totalAssigned,
          totalCompleted,
          completionRate: `${completionRate}%`,
          timeSpent: `${hours}h ${mins}m`,
        },
      };
    });

    res.status(200).json({ report });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getProjectEmployeeReport };
