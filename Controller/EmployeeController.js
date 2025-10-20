const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");
const SubTask = require("../Modal/SubTaskModal");
const TimeLog = require("../Modal/Timelog");
const mongoose = require("mongoose");
const { User } = require("../Modal/User");

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


const getEmployeeProjects = async (req, res) => {
  try {
    const userId = req.user._id; // login user ka id (requireAuth se aata hai)

    const projects = await Project.find({
      "team.user": userId, // filter: user project team me hai
    })
      .populate("createdBy", "name email")
      .populate({
        path: "Tasks",
        select: "title status assignees", // sirf basic fields
      });

    return res.status(200).json({ projects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

// controllers/EmployeeController.js


const getEmployeeTasksByProject = async (req, res) => {
  try {
    const userId = req.user._id;
    const projectId = req.params.id;

    const tasks = await Task.find({
      project: projectId,
      "assignees.user": userId, // sirf wo tasks jisme employee assign hai
    })
      .populate("project", "name")
      .populate("assignees.user", "name email avatarUrl");

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

// controllers/EmployeeController.js


const getEmployeeSubTasksByTask = async (req, res) => {
  try {
    const userId = req.user._id;
    const taskId  = req.params.id;

    const subtasks = await SubTask.find({
      task: taskId,
      "assignees.user": userId, // sirf wo subtasks jisme employee assign hai
    })
      .populate("task", "title")
      .populate("assignees.user", "name email");

    return res.status(200).json({ subtasks });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ FailureMessage: "Internal server error" });
  }
};



const getEmployeeMilestoneReportByEmployeeId = async (req, res) => {
  try {
    const { userId, MilestoneId } = req.body;

    if (!userId || !MilestoneId) {
      return res.status(400).json({ FailureMessage: "Please provide both userId and MilestoneId" });
    }

    // 🔍 Step 1: Find all SubTasks for this Milestone (task = milestone)
    const subTasks = await SubTask.find({ task: MilestoneId })
      .populate({
        path: "timeLogs",
        match: { user: userId },
        select: "startTime endTime duration user",
      })
      .populate({
        path: "task",
        select: "title",
      });

    if (!subTasks.length) {
      return res.status(404).json({ FailureMessage: "No SubTasks found for this milestone." });
    }

    // 🧮 Step 2: Calculate durations per subtask
    let totalMinutes = 0;
    const formattedSubtasks = subTasks.map((sub) => {
  const totalSubMinutes = sub.timeLogs.reduce((sum, log) => {
  const durationMs = log.duration || 0;
  const durationMinutes = durationMs / (1000 * 60); // convert ms → minutes
  return sum + durationMinutes;
}, 0);

      totalMinutes += totalSubMinutes;
      return {
        name: sub.title,
        duration: formatDuration(totalSubMinutes),
      };
    });

    // 👨‍💼 Step 3: Fetch employee info
    const employee = await User.findById(userId).select("name email role avatarUrl");
    if (!employee) {
      return res.status(404).json({ FailureMessage: "Employee not found." });
    }

    // 🧱 Step 4: Prepare final report structure
    const milestoneTitle = subTasks[0]?.task?.title || "Untitled Milestone";
    const report = {
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        avatar: employee.avatarUrl,
        role: employee.role,
      },
      milestone: {
        id: MilestoneId,
        title: milestoneTitle,
        duration: formatDuration(totalMinutes),
        subtasks: formattedSubtasks,
      },
      totalDuration: formatDuration(totalMinutes),
    };

    res.status(200).json({
      SuccessMessage: "Employee milestone report generated successfully.",
      report,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error", error: error.message });
  }
};
const getEmployeeReportByProjectId= async (req, res) => {
  try {
    const { userId, projectId } = req.body;

    if (!userId || !projectId)
      return res.status(400).json({ FailureMessage: "Please provide userId and projectId" });

    // 🔹 Fetch user info
    const employee = await User.findById(userId).select("name email avatarUrl role");
    if (!employee) return res.status(404).json({ FailureMessage: "Employee not found" });

    // 🔹 Fetch all tasks (milestones) for this project
    const milestones = await Task.find({ project: projectId }).populate('project');
    console.log(milestones);
    

    const reportMilestones = [];
    let totalDuration = 0;

    for (const milestone of milestones) {
      const subtasks = await SubTask.find({ task: milestone._id });

      let milestoneDuration = 0;

      for (const subtask of subtasks) {
        const timeLogs = await TimeLog.find({
          subTask: subtask._id,
          user: userId
        });

        for (const log of timeLogs) {
          milestoneDuration += log.duration;
        }
      }

      reportMilestones.push({
        id: milestone._id,
        title: milestone.title,
        duration: formatDuration2(milestoneDuration)
      });

      totalDuration += milestoneDuration;
    }

    const report = {
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        avatar: employee.avatarUrl,
        role: employee.role
      },
      project: {
        id: projectId,
        title: milestones?.[0]?.project.name || "Project",
        milestones: reportMilestones
      },
      totalDuration: formatDuration2(totalDuration)
    };

    res.status(200).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
}
const formatDuration2 = (ms) => {
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};
// 🕒 Utility to convert minutes → readable time (e.g. "6h 40m")
function formatDuration(totalMinutes) {
  if (!totalMinutes) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
}
module.exports = {
  getProjectEmployeeReport,
  getEmployeeProjects,
  getEmployeeTasksByProject,
  getEmployeeSubTasksByTask,
  getEmployeeMilestoneReportByEmployeeId,
  getEmployeeReportByProjectId
};
