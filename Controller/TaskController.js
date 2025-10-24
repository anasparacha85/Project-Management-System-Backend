const { default: mongoose } = require("mongoose");
const updateProjectProgress = require("../helper/projrectprogresshelper");
const updateTaskProgress = require("../helper/taskprogresshelper");
const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");
const { User } =require("../Modal/User");
const createTask = async (req, res) => {
  try {
     const projectId=req.params.id
    const { title, description,   priority, startDate, dueDate, milestone } = req.body;
    const userId = req.user._id;
  
console.log(req.files);



    if (!title || !projectId) {
      return res.status(400).json({ FailureMessage: "Task title and projectId are required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }
    let StartDate=new Date(startDate);
    let ProjectStartDate=new Date(project.startDate)
    let DueDate=new Date(dueDate);
    let ProjectDueDate=new Date(project.endDate)
    if(StartDate<ProjectStartDate){
      return res.status(400).json({FailureMessage:"start date can not be set before the project start date"})
    }
   else if(DueDate<ProjectStartDate){
      return res.status(400).json({FailureMessage:"milestone can no be finished before project start"})
    }
   else if(startDate>ProjectDueDate){
      return res.status(400).json({FailureMessage:"milestone can not be started after project ends"})
    }
    else if(DueDate>ProjectDueDate){
      return res.status(400).json({FailureMessage:"milestone can not ends after the project ends"})
    }
    
    
    

  let assigneeIds = req.body.assigneeIds;

// agar frontend se JSON string aaya hai to parse karo
if (typeof assigneeIds === "string") {
  try {
    assigneeIds = JSON.parse(assigneeIds);
  } catch (e) {
    assigneeIds = [];
  }
}

let assignees = [];
if (assigneeIds && assigneeIds.length > 0) {
  const users = await User.find({ _id: { $in: assigneeIds } });
  assignees = users.map(u => ({
    user: u._id,
    status: "todo"
  }));
}
let dependencies = req.body.dependencies;
if (typeof dependencies === "string") {
  try {
    dependencies = JSON.parse(dependencies);
  } catch (e) {
    dependencies = [];
  }
}

const attachments = (req.files || []).map(file => ({
  filename: file.originalname || file.filename,
  url: file.path,
  uploadedBy: req.user._id,   // jisne file upload ki
  uploadedAt: new Date(),     // current time
}));


    

    const task = await Task.create({
      title,
      description,
      project: project._id,
      assignees,
      priority,
      startDate,
      dueDate,
      dependencies,
      milestone,
      createdBy: userId,
      attachments
      
      
    });
    project.Tasks.push(task._id)
   await  project.save()

    await updateTaskProgress(task._id);
    // await updateProjectProgress(project._id);

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

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // sirf team ka data bhejna hai
    res.json(project.team);

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

      if (updatedTaskstartDate && updatedTaskstartDate > projectEndDate) {
        return res.status(400).json({
          FailureMessage: "Task start date cannot be after the project end date",
        });
      }

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

   await  updateTaskProgress(task._id);
    // await updateProjectProgress(task.project);


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

      if (updatedTaskstartDate && updatedTaskstartDate > projectEndDate) {
        return res.status(400).json({
          FailureMessage: "Task start date cannot be after the project end date",
        });
      }

      if (updatedTaskDueDate && updatedTaskDueDate > projectEndDate) {
        return res.status(400).json({
          FailureMessage: "Task due date cannot be after the project end date",
        });
      }
    }

    // agar dependencies completed hain to update allow karo
    const task = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("assignees.user", "name email")
      .populate("createdBy", "name email");

   await  updateTaskProgress(task._id);
    // await updateProjectProgress(task.project);


    res.status(200).json({
      SuccessMessage: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};



const deleteTaskById=async(req,res)=>{
  try {
    const id=req.params.id;
    const task=await Task.findById(id);
    if(!task){
      return res.status(404).json({FailureMessage:"No Task Found"})
    }
    await Task.deleteOne({_id:task._id})
    res.status(200).json({SuccessMessage:"milestone deleted successfully"})
  } catch (error) {
    res.status(500).json({FailureMessage:"Internal server error"})
    
  }
}
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

module.exports={createTask,fetchMembersByProjectid,fetchtasksbyProjectId,deleteTaskById,fetchTeamByProjectId,fetchTaskByID,updateManagerTaskByID,updateEmployeeTaskByID,fetchMilestoneReportById}
