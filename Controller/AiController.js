const genAI = require("../config/generativeaiconfig");
const {
  generateProjectBreakdown,
  generateTasksForProject,
  validateGeneratedData,
  validateProjectData,
} = require("../services/aiProjectService");
const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");
const SubTask = require("../Modal/SubTaskModal");
const { notifyUser } = require("../helper/notifyUser");
const mongoose = require("mongoose");

const GenerateDescription = async (req, res) => {
  try {
    const { name, type, parent } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Name is required for description generation" });
    }

    let prompt = "";
if (type === "project") {
  prompt = `Give me a brief detail for the project "${name}" which i want to create`;
} else if (type === "milestone") {
  prompt = `Give me a brief detail for the milestone "${name}" of the project "${parent}" in a friendly and professional way.`;
} else if (type === "checkpoint") {
  prompt = `Give me a brief detail for the for the checkpoint "${name}" under the milestone "${parent}". Keep it human and direct.`;
} else {
  prompt = `Write a short, clear, and natural description for "${name}".`;
}

    const response = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent(prompt);
    console.log(response);
    
    // ✅ Extract text safely
    const descriptionText = response?.response?.text() || "No description generated.";

    res.json({ description: descriptionText });

  } catch (err) {
    console.error("AI description generation failed:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * POST /api/ai/generate-project-breakdown
 * User describes project, AI generates full breakdown
 */
const generateProjectBreakdownController = async (req, res) => {
  try {
    const { projectDescription, startDate, endDate } = req.body;
    const managerId = req.user._id;

    if (!projectDescription || !startDate || !endDate) {
      return res.status(400).json({
        FailureMessage: "projectDescription, startDate, and endDate are required",
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({
        FailureMessage: "End date must be after start date",
      });
    }

    // Generate via AI
    const aiResult = await generateProjectBreakdown(
      projectDescription,
      startDate,
      endDate
    );

    if (!aiResult.success) {
      return res.status(500).json({
        FailureMessage: "AI generation failed",
        errors: aiResult.errors,
      });
    }

    // Validate project data
    const projectValidation = validateProjectData(aiResult.data);
    if (!projectValidation.valid) {
      return res.status(400).json({
        FailureMessage: "Generated project data is invalid",
        errors: projectValidation.errors,
      });
    }

    const { projectName, projectDescription: desc, budget, tasks } = aiResult.data;

    // Validate tasks
    const validation = validateGeneratedData(aiResult.data, {
      startDate,
      endDate,
    });

    if (!validation.valid) {
      return res.status(400).json({
        FailureMessage: "Generated data violates project constraints",
        errors: validation.errors,
      });
    }

    // Create Project
    const project = await Project.create({
      name: projectName,
      description: desc,
      budget,
      startDate,
      endDate,
      createdBy: managerId,
      team: [{ user: managerId, role: "manager" }],
      projectStatus: "draft",
      priority: "Medium",
    });

    // Create Tasks & SubTasks
    const createdTasks = [];
    for (const taskData of tasks) {
      const task = await Task.create({
        title: taskData.title,
        description: taskData.description,
        project: project._id,
        priority: taskData.priority,
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        createdBy: managerId,
        assignees: [],
      });

      // Create SubTasks
      if (taskData.subtasks && Array.isArray(taskData.subtasks)) {
        for (const stData of taskData.subtasks) {
          const subtask = await SubTask.create({
            title: stData.title,
            description: stData.description,
            task: task._id,
            priority: stData.priority,
            dueDate: stData.dueDate,
            createdBy: managerId,
            assignees: [],
          });
          task.subTasks.push(subtask._id);
        }
      }

      await task.save();
      project.Tasks.push(task._id);
      createdTasks.push(task);
    }

    await project.save();

    console.log(
      `[AI] Generated project "${projectName}" with ${createdTasks.length} tasks`
    );
    
    return res.status(201).json({
      SuccessMessage: "Project breakdown generated successfully (DRAFT mode)",
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        status: "draft",
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        taskCount: createdTasks.length,
        note: "Review and assign team members before activation",
      },
    });
  } catch (error) {
    console.error("generateProjectBreakdown error:", error);
    return res.status(500).json({
      FailureMessage: "Server error",
      error: error.message,
    });
  }
};

/**
 * POST /api/ai/generate-tasks
 * Generate tasks for an existing project
 */
const generateTasksController = async (req, res) => {
  try {
    const { projectId, taskDescription, numberOfTasks = 5 } = req.body;
    console.log(projectId);
    

    if (!projectId || !taskDescription) {
      return res.status(400).json({
        FailureMessage: "projectId and taskDescription are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        FailureMessage: "Invalid project ID",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }
    console.log(project);
    const startDate = project.startDate 
  ? project.startDate.toISOString().split("T")[0] 
  : null;

const endDate = project.endDate 
  ? project.endDate.toISOString().split("T")[0] 
  : null;

    
    // Generate via AI
    const aiResult = await generateTasksForProject(
      projectId,
      project.name,
      project.description,
      taskDescription,
      numberOfTasks,
      startDate,
      endDate
    );

    if (!aiResult.success) {
      return res.status(500).json({
        FailureMessage: "AI task generation failed",
        errors: aiResult.errors,
      });
    }

    // Validate
    const validation = validateGeneratedData(aiResult.data, project);
    if (!validation.valid) {
      return res.status(400).json({
        FailureMessage: "Generated tasks violate project constraints",
        errors: validation.errors,
      });
    }

    // Create tasks
    const createdTasks = [];
    for (const taskData of aiResult.data.tasks) {
      const task = await Task.create({
        title: taskData.title,
        description: taskData.description,
        project: projectId,
        priority: taskData.priority,
        startDate: taskData.startDate,
        dueDate: taskData.dueDate,
        createdBy: req.user._id,
        assignees: [],
      });

      // Create subtasks
      if (taskData.subtasks && Array.isArray(taskData.subtasks)) {
        for (const stData of taskData.subtasks) {
          const subtask = await SubTask.create({
            title: stData.title,
            description: stData.description,
            task: task._id,
            priority: stData.priority,
            dueDate: stData.dueDate,
            createdBy: req.user._id,
            assignees: [],
          });
          task.subTasks.push(subtask._id);
        }
      }

      await task.save();
      project.Tasks.push(task._id);
      createdTasks.push(task);
    }

    await project.save();

    console.log(
      `[AI] Generated ${createdTasks.length} tasks for project "${project.name}"`
    );

    return res.status(201).json({
      SuccessMessage: "Tasks generated successfully",
      taskCount: createdTasks.length,
      tasks: createdTasks.map((t) => ({
        _id: t._id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        subtaskCount: t.subTasks?.length || 0,
      })),
    });
  } catch (error) {
    console.error("generateTasks error:", error);
    return res.status(500).json({
      FailureMessage: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  GenerateDescription,
  generateProjectBreakdownController,
  generateTasksController,
};
