const { default: mongoose } = require("mongoose");
const updateProjectProgress = require("../helper/projrectprogresshelper");
const updateTaskProgress = require("../helper/taskprogresshelper");
const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");
const { User } =require("../Modal/User");
const { notifyUser } = require("../helper/notifyUser");
const createTask = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, description, priority, startDate, dueDate, milestone } = req.body;
    const userId = req.user._id;

    if (!title || !projectId) {
      return res.status(400).json({ FailureMessage: "Task title and projectId are required" });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }

    // DATE VALIDATION (fast)
    const StartDate = new Date(startDate);
    const DueDate = new Date(dueDate);
    const PS = new Date(project.startDate);
    const PD = new Date(project.endDate);

    if (StartDate < PS || DueDate < PS || StartDate > PD ) {
      return res.status(400).json({ FailureMessage: "Invalid date range" });
    }

    // Parse JSON safely
    let assigneeIds = req.body.assigneeIds;
    if (typeof assigneeIds === "string") {
      assigneeIds = JSON.parse(assigneeIds || "[]");
    }

    let dependencies = req.body.dependencies;
    if (typeof dependencies === "string") {
      dependencies = JSON.parse(dependencies || "[]");
    }

    // Efficient Users Fetch
    const users = await User.find({ _id: { $in: assigneeIds } }).lean();

    const assignees = users.map(u => ({
      user: u._id,
      status: "todo"
    }));

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname || file.filename,
      url: file.path,
      uploadedBy: userId,
      uploadedAt: new Date()
    }));

    // Create Task
    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignees,
      priority,
      startDate,
      dueDate,
      dependencies,
      milestone,
      createdBy: userId,
      attachments
    });
const relativeLink = `/dashboard/milestone/${task._id}`; // For React Router
const absoluteLink = `${process.env.FRONTEND_URL}${relativeLink}`; // For emails    // Fast push
    await Project.updateOne({ _id: projectId }, { $push: { Tasks: task._id } });

    // FAST NOTIFICATIONS
    await Promise.all(
      assignees.map(a =>
        notifyUser({
          type: "task-assigned",
          message: `You have been assigned a new task: ${task.title}`,
          recipientId: a.user,
          project: projectId,
          task: task._id,
          title: "New Milestone Assigned",
          link:relativeLink,
          emailLink:absoluteLink
        })
      )
    );

    return res.status(201).json({
      SuccessMessage: "Task created successfully",
      task
    });

  } catch (err) {
    console.error("Error creating task:", err);
    res.status(500).json({ FailureMessage: "Server error", error: err.message });
  }
};

const fetchMembersByProjectid = async (req, res) => {
  try {
    const projectId = req.params.id;

    const project = await Project.findById(projectId)
      .populate({
        path: "team.user", // populate user inside team
        // select: "name email profilePic" // sirf ye fields lao user model se
      });
      console.log(project,"===========");
      

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // sirf team ka data bhejna hai
    res.json({team:project.team  ,teamName:project.teamName  });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
const fetchtasksbyProjectId=async(req,res)=>{
    try {
        const projectid=req.params.id;
        console.log(projectid);
        
        const tasks=await Task.find({project:projectid}).populate({
            path:"assignees.user"
        });
        console.log("tasks",tasks);
        
        if(tasks.length===0  || !tasks){
            return res.status(400).json({FailureMessage:"no tasks found"})
        }
        res.status(200).json(tasks)
    } catch (error) {
        res.status(500).json({FailureMessage:"Internal server error"})
        
    }
}

const fetchTeamByProjectId=async(req,res)=>{
  try {
    console.log("hi");
    
    const projectId=req.params.id;
    console.log(projectId);
    
    const Team=await Project.findOne({_id:projectId}).populate({path:'team.user'})
    console.log("hi",Team);
    
    if(Team.length===0 || !Team){
      return res.status(403).json({FailureMessage:"No Team found"})
    }
    res.status(200).json(Team)

  } catch (error) {
    res.status(500).json({FailureMessage:'internal server error',error:error})
    
  }
}
const fetchTaskByID=async(req,res)=>{
  try {
   try {
        const taskId=req.params.id;
        const milestone=await Task.findOne({_id:taskId}).populate([
    { path: "attachments.uploadedBy" },
    { path: "assignees.user" },
    { path: "dependencies" },
    { path: "createdBy" },
    { path: "subTasks" }
  ]);
        if(!milestone){
            return res.status(400).json({FailureMessage:'no milestone found'})
        }
        res.status(200).json(milestone)

    } catch (error) {
        console.log(error);
        
        res.status(500).json({FailureMessage:"internal server error"})
        
    }
    

  } catch (error) {
    
  }
}
const updateManagerTaskByID = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
     console.log("you fetched manager update task by id");

    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ FailureMessage: "Task not found" });
    }

    const project = await Project.findById(existingTask.project);
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }

    // Agar status update karna hai
    if (updates.status && updates.status !== existingTask.status) {
        const allowedForManager = ["todo", "in-progress", "review","completed"];
    if (!allowedForManager.includes(updates.status)) {
      return res.status(403).json({ FailureMessage: "Invalid status transition for employee." });
    }
      if (updates.status === "ready-for-review") {
      return res.status(403).json({ FailureMessage: "Managers cannot mark tasks as ready-for-review." });
    }
      const taskWithDeps = await Task.findById(id).populate("dependencies", "status");

      if (!taskWithDeps) {
        return res.status(404).json({ FailureMessage: "Task not found" });
      }

      // check karo dependencies completed hain ya nahi
      const incompleteDeps = taskWithDeps.dependencies.filter(
        (dep) => dep.status !== "completed"
      );

      if (incompleteDeps.length > 0) {
        return res.status(400).json({
          FailureMessage: "Cannot update status until all dependencies are completed",
          incompleteDependencies: incompleteDeps.map((d) => ({
            id: d._id,
            title: d.title,
            status: d.status,
          })),
        });
      }
    }

    // ✅ Date validations sirf tabhi jab dates aayein
    if (updates.startDate || updates.dueDate) {
      const updatedTaskstartDate = updates.startDate ? new Date(updates.startDate) : null;
      const updatedTaskDueDate = updates.dueDate ? new Date(updates.dueDate) : null;

      const projectStartDate = new Date(project.startDate);
      const projectEndDate = new Date(project.endDate);

      // 1. Task apna start < end check
      if (updatedTaskstartDate && updatedTaskDueDate && updatedTaskDueDate < updatedTaskstartDate) {
        return res.status(400).json({
          FailureMessage: "You cannot set the due date before the start date",
        });
      }

      // 2. Project ke against check
      if (updatedTaskstartDate && updatedTaskstartDate < projectStartDate) {
        return res.status(400).json({
          FailureMessage: "Task start date cannot be before the project start date",
        });
      }

      if (updatedTaskDueDate && updatedTaskDueDate < projectStartDate) {
        return res.status(400).json({
          FailureMessage: "Task due date cannot be before the project start date",
        });
      }

      // if (updatedTaskstartDate && updatedTaskstartDate > projectEndDate) {
      //   return res.status(400).json({
      //     FailureMessage: "Task start date cannot be after the project end date",
      //   });
      // }

      // if (updatedTaskDueDate && updatedTaskDueDate > projectEndDate) {
      //   return res.status(400).json({
      //     FailureMessage: "Task due date cannot be after the project end date",
      //   });
      // }
    }

    // agar dependencies completed hain to update allow karo
    const task = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("assignees.user", "name email")
      .populate("createdBy", "name email");

    await updateTaskProgress(task._id);

    // Notify all assignees about the update
    const actorName = req.user && req.user.name ? req.user.name : "A manager";
    if (task && task.assignees && task.assignees.length > 0) {
      await Promise.all(
        task.assignees.map(a =>
          notifyUser({
            type: "task-updated",
            message: `Task '${task.title}' was updated by ${actorName}.`,
            recipientId: a.user._id || a.user,
            project: task.project,
            task: task._id,
            title: "Task Updated",
            link: `/dashboard/milestone/${task._id}`,
            emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${task._id}`
          })
        )
      );
    }

    res.status(200).json({
      SuccessMessage: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

const updateEmployeeTaskByID = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
  
    
    console.log("you fetched employee update task by id");
      console.log(updates);
    

    const existingTask = await Task.findById(id);
    if (!existingTask) {
      return res.status(404).json({ FailureMessage: "Task not found" });
    }

    const project = await Project.findById(existingTask.project);
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }

    // Agar status update karna hai
    if (updates.status && updates.status !== existingTask.status) {
       const allowedForEmployee = ["todo", "in-progress", "ready-for-review"];
    if (!allowedForEmployee.includes(updates.status)) {
      return res.status(403).json({ FailureMessage: "Invalid status transition for employee." });
    }
    
       if (updates.status.toLowerCase() === "ready-for-review") {
        updates.status="review"
    }
      const taskWithDeps = await Task.findById(id).populate("dependencies", "status");

      if (!taskWithDeps) {
        return res.status(404).json({ FailureMessage: "Task not found" });
      }

      // check karo dependencies completed hain ya nahi
      const incompleteDeps = taskWithDeps.dependencies.filter(
        (dep) => dep.status !== "completed"
      );

      if (incompleteDeps.length > 0) {
        return res.status(400).json({
          FailureMessage: "Cannot update status until all dependencies are completed",
          incompleteDependencies: incompleteDeps.map((d) => ({
            id: d._id,
            title: d.title,
            status: d.status,
          })),
        });
      }
    }

    // ✅ Date validations sirf tabhi jab dates aayein
    if (updates.startDate || updates.dueDate) {
      const updatedTaskstartDate = updates.startDate ? new Date(updates.startDate) : null;
      const updatedTaskDueDate = updates.dueDate ? new Date(updates.dueDate) : null;

      const projectStartDate = new Date(project.startDate);
      const projectEndDate = new Date(project.endDate);

      // 1. Task apna start < end check
      if (updatedTaskstartDate && updatedTaskDueDate && updatedTaskDueDate < updatedTaskstartDate) {
        return res.status(400).json({
          FailureMessage: "You cannot set the due date before the start date",
        });
      }

      // 2. Project ke against check
      if (updatedTaskstartDate && updatedTaskstartDate < projectStartDate) {
        return res.status(400).json({
          FailureMessage: "Task start date cannot be before the project start date",
        });
      }

      if (updatedTaskDueDate && updatedTaskDueDate < projectStartDate) {
        return res.status(400).json({
          FailureMessage: "Task due date cannot be before the project start date",
        });
      }

      // if (updatedTaskstartDate && updatedTaskstartDate > projectEndDate) {
      //   return res.status(400).json({
      //     FailureMessage: "Task start date cannot be after the project end date",
      //   });
      // }

      // if (updatedTaskDueDate && updatedTaskDueDate > projectEndDate) {
      //   return res.status(400).json({
      //     FailureMessage: "Task due date cannot be after the project end date",
      //   });
      // }
    }

    // agar dependencies completed hain to update allow karo
    const task = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("assignees.user", "name email")
      .populate("createdBy", "name email");

    await updateTaskProgress(task._id);

    // Notify manager (creator) about employee status update
    const actorName = req.user && req.user.name ? req.user.name : "An employee";
    if (task && task.createdBy && task.createdBy._id) {
      await notifyUser({
        type: "task-status-updated",
        message: `Task '${task.title}' status was updated by ${actorName} to '${updates.status}'.`,
        recipientId: task.createdBy._id,
        project: task.project,
        task: task._id,
        title: "Task Status Updated",
        link: `/dashboard/milestone/${task._id}`,
        emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${task._id}`
      });
    }

    res.status(200).json({
      SuccessMessage: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};



const deleteTaskById = async (req, res) => {
  try {
    const id = req.params.id;
    const task = await Task.findById(id).populate("assignees.user").populate("createdBy");
    if (!task) {
      return res.status(404).json({ FailureMessage: "No Task Found" });
    }
    await Task.deleteOne({ _id: task._id });

    // Notify all assignees and creator about deletion
    const actorName = req.user && req.user.name ? req.user.name : "A manager";
    const notifyList = [];
    if (task.assignees && task.assignees.length > 0) {
      task.assignees.forEach(a => {
        notifyList.push(
          notifyUser({
            type: "task-deleted",
            message: `Task '${task.title}' has been deleted by ${actorName}.`,
            recipientId: a.user._id || a.user,
            project: task.project,
            task: task._id,
            title: "Task Deleted",
            link: `/dashboard/milestone/${task._id}`,
            emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${task._id}`
          })
        );
      });
    }
    if (task.createdBy && task.createdBy._id) {
      notifyList.push(
        notifyUser({
          type: "task-deleted",
          message: `Task '${task.title}' has been deleted by ${actorName}.`,
          recipientId: task.createdBy._id,
          project: task.project,
          task: task._id,
          title: "Task Deleted",
          link: `/dashboard/milestone/${task._id}`,
          emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${task._id}`
        })
      );
    }
    await Promise.all(notifyList);

    res.status(200).json({ SuccessMessage: "milestone deleted successfully" });
  } catch (error) {
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};
const fetchMilestoneReportById = async (req, res) => {
  try {
    const milestoneId = new mongoose.Types.ObjectId(req.params.id);

    const report = await Task.aggregate([
      { $match: { _id: milestoneId } },

      // Join subtasks
      {
        $lookup: {
          from: "subtasks",
          localField: "_id",
          foreignField: "task",
          as: "subTaskDetails"
        }
      },

      // Join assignees
      {
        $lookup: {
          from: "users",
          localField: "assignees.user",
          foreignField: "_id",
          as: "assigneeDetails"
        }
      },

      // Counts
      {
        $addFields: {
          numberOfSubtasks: { $size: "$subTaskDetails" },
          numberOfAssignees: { $size: "$assignees" },
          completedSubtasks: {
            $size: {
              $filter: {
                input: "$subTaskDetails",
                cond: { $eq: ["$$this.status", "completed"] }
              }
            }
          }
        }
      },

      // Status breakdown
      {
        $addFields: {
          subtaskStatusBreakdown: [
            {
              status: "Completed",
              count: {
                $size: {
                  $filter: {
                    input: "$subTaskDetails",
                    cond: { $eq: ["$$this.status", "completed"] }
                  }
                }
              }
            },
            {
              status: "In Progress",
              count: {
                $size: {
                  $filter: {
                    input: "$subTaskDetails",
                    cond: { $eq: ["$$this.status", "in-progress"] }
                  }
                }
              }
            },
            {
              status: "Review",
              count: {
                $size: {
                  $filter: {
                    input: "$subTaskDetails",
                    cond: { $eq: ["$$this.status", "review"] }
                  }
                }
              }
            },
            {
              status: "Todo",
              count: {
                $size: {
                  $filter: {
                    input: "$subTaskDetails",
                    cond: { $eq: ["$$this.status", "todo"] }
                  }
                }
              }
            }
          ]
        }
      },

      // Milestone progress %
      {
        $addFields: {
          milestoneProgress: {
            $cond: [
              { $gt: ["$numberOfSubtasks", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$completedSubtasks", "$numberOfSubtasks"] },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          }
        }
      },

      // Projection
      {
        $project: {
          title: 1,
          description: 1,
          startDate: 1,
          dueDate: 1,
          priority: 1,
          status: 1,
          numberOfSubtasks: 1,
          numberOfAssignees: 1,
          completedSubtasks: 1,
          subtaskStatusBreakdown: 1,
          milestoneProgress: 1,
          assigneeDetails: { _id: 1, name: 1, email: 1, avatar: 1 },
          subTaskDetails: {
            _id: 1,
            title: 1,
            status: 1,
            progress: 1,
            startDate: 1,
            dueDate: 1,
            assignees: 1
          }
        }
      }
    ]);

    if (!report || report.length === 0) {
      return res.status(404).json({ FailureMessage: "Milestone not found" });
    }

    let milestone = report[0];

    // ✅ Progress History Generation
    const start = new Date(milestone.startDate);
    const end = new Date(milestone.dueDate);
    const totalDays =
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1; // total duration

    const progressHistory = [];
    let completedSubtasks = milestone.completedSubtasks || 0;
    const totalSubtasks = milestone.numberOfSubtasks || 1;

    for (let i = 1; i <= totalDays; i++) {
      const planned = Math.round((i / totalDays) * 100); // planned progress %
      const actual = Math.round(
        (completedSubtasks / totalSubtasks) * 100
      ); // actual progress (static for now)

      progressHistory.push({
        day: `Day ${i}`,
        planned,
        actual
      });
    }

    // Attach progressHistory
    milestone.progressHistory = progressHistory;

    res.status(200).json(milestone);
  } catch (error) {
    console.error("Error in fetchMilestoneReportById:", error);
    res.status(500).json({ error: error.message });
  }
};
const uploadfilesByTaskId = async (req, res) => {
  try {
    const { id: taskId } = req.params;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ FailureMessage: "Invalid milestone ID" });
    }

    // Validate uploaded files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ FailureMessage: "No files uploaded" });
    }

    const milestone = await Task.findById(taskId).populate("assignees.user").populate("createdBy");
    if (!milestone) {
      return res.status(404).json({ FailureMessage: "Milestone not found" });
    }

    // Map uploaded files into a clean structure
    const uploadedFiles = req.files.map((file) => ({
      filename: file.originalname || file.filename,
      url: file.path, // Cloudinary gives `path` as secure_url
      size: file.size || 0,
      uploadedAt: new Date(),
    }));

    // Push all new files in one go
    milestone.attachments.push(...uploadedFiles);
    await milestone.save();

    // Notify all assignees and creator about new file upload
    const actorName = req.user && req.user.name ? req.user.name : "A user";
    const notifyList = [];
    if (milestone.assignees && milestone.assignees.length > 0) {
      milestone.assignees.forEach(a => {
        notifyList.push(
          notifyUser({
            type: "task-file-uploaded",
            message: `New files have been uploaded to task '${milestone.title}' by ${actorName}.`,
            recipientId: a.user._id || a.user,
            project: milestone.project,
            task: milestone._id,
            title: "Files Uploaded",
            link: `/dashboard/milestone/${milestone._id}`,
            emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${milestone._id}`
          })
        );
      });
    }
    if (milestone.createdBy && milestone.createdBy._id) {
      notifyList.push(
        notifyUser({
          type: "task-file-uploaded",
          message: `New files have been uploaded to task '${milestone.title}' by ${actorName}.`,
          recipientId: milestone.createdBy._id,
          project: milestone.project,
          task: milestone._id,
          title: "Files Uploaded",
          link: `/dashboard/milestone/${milestone._id}`,
          emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${milestone._id}`
        })
      );
    }
    await Promise.all(notifyList);

    return res.status(200).json({
      SuccessMessage: "Files uploaded successfully",
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      FailureMessage: "Internal Server Error",
      details: error.message,
    });
  }
};

module.exports={createTask,uploadfilesByTaskId,fetchMembersByProjectid,fetchtasksbyProjectId,deleteTaskById,fetchTeamByProjectId,fetchTaskByID,updateManagerTaskByID,updateEmployeeTaskByID,fetchMilestoneReportById}
