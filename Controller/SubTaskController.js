const Task = require('../Modal/TaskModal')
const SubTask = require('../Modal/SubTaskModal.js');
const { default: mongoose } = require('mongoose');
const updateTaskProgress = require('../helper/taskprogresshelper.js');
const updateSubtaskStatus = require('../helper/subtaskprogresshelper.js');
const updateSubtaskProgress = require('../helper/subtaskprogresshelper.js');
const { notifyUser } = require('../helper/notifyUser');
const TimeLog = require('../Modal/Timelog.js');
const handleSubtaskTimeLogStatusChange = require('../helper/SubTaskChangeProgressHelper.js');


// ----------- Create SubTask API -----------
const CreateSubTask = async (req, res) => {
  try {
    const { id } = req.params; // parent task id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ FailureMessage: "Invalid Task ID" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ FailureMessage: "Parent Task not found" });
    }

    // Fields from formData
    const {
      title,
      description,
      priority,
      startDate,
      dueDate,
      assignees,
    } = req.body;



    if (!title) {
      return res.status(400).json({ FailureMessage: "Subtask title required" });
    }
    const TaskStartDate = new Date(task.startDate)
    const TaskEndDate = new Date(task.dueDate)
    const SubTaskStartDate = new Date(startDate)
    const SubTaskEndDate = new Date(dueDate)
    if (SubTaskStartDate < TaskStartDate) {
      return res.status(400).json({ FailureMessage: "start date can not be before the milestone start date" })
    }
    if (SubTaskEndDate < TaskStartDate) {
      return res.status(400).json({ FailureMessage: "end date can not be before the milestone start date" })
    }
    // if (SubTaskEndDate > TaskEndDate) {
    //   return res.status(400).json({ FailureMessage: "end date can not be after the milestone end date" })
    // }

    // Parse assignees (array of { user, status })
    let parsedAssignees = [];
    if (assignees) {
      try {
        parsedAssignees = JSON.parse(assignees);
      } catch (e) {
        return res.status(400).json({ FailureMessage: "Invalid assignees format" });
      }
    }
    console.log(req.files);

    // Handle Cloudinary uploads
    const files = req.files
      ? req.files.map((file) => ({
        filename: file.originalname || file.filename,
        url: file.path, // 👈 Cloudinary ne jo hosted URL diya
        uploadedBy: req.user._id, // assuming auth middleware
        uploadedAt: new Date(),
      }))
      : [];

    // Create subtask
    const newSubTask = new SubTask({
      title,
      description,
      priority,
      startDate,
      dueDate,
      assignees: parsedAssignees,
      attachments: files,
      createdBy: req.user._id, // logged in user
      task: id,
    });

    await newSubTask.save();

    // Add subtask to parent task
    task.subTasks.push(newSubTask._id);
    await task.save();
    await updateSubtaskProgress(newSubTask._id)
    // await updateTaskProgress(task._id)

    // Notify assignees about new subtask
    try {
      const actorName = req.user && req.user.name ? req.user.name : 'A user';
      if (parsedAssignees && parsedAssignees.length > 0) {
        await Promise.all(
          parsedAssignees.map((a) =>
            notifyUser({
              type: 'subtask-assigned',
              message: `You have been assigned a new subtask '${newSubTask.title}' by ${actorName}.`,
              recipientId: a.user || a.userId || a,
              project: task.project,
              subTask: newSubTask._id,
              title: 'New SubTask Assigned',
              link: `/dashboard/subtask/${newSubTask._id}`,
              emailLink: `${process.env.FRONTEND_URL}/dashboard/subtask/${newSubTask._id}`,
            })
          )
        );
      }
    } catch (notifyErr) {
      console.error('Notify error (CreateSubTask):', notifyErr);
    }

    return res.status(201).json({
      SuccessMessage: "Subtask created successfully",
      subtask: newSubTask,
    });
  } catch (error) {
    console.error("CreateSubTask error:", error);
    return res.status(500).json({ FailureMessage: "Server Error" });
  }
};
const getSubTasksByTaskId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("task id", id);


    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ FailureMessage: "Not a valid Task ID" });
    }

    const subTasks = await SubTask.find({ task: id })
      .populate("createdBy", "name email") // ✅ show specific fields
      .populate({
        path: "attachments.uploadedBy",
        select: "name email", // ✅ only return these fields
      })
      .populate({ path: 'assignees.user' })

    if (!subTasks) {
      return res.status(404).json({ FailureMessage: "No subtasks found for this task" });
    }

    return res.status(200).json({
      SuccessMessage: "Subtasks fetched successfully",
      subTasks,
    });
  } catch (error) {
    console.error("getSubTasksByTaskId error:", error);
    return res.status(500).json({ FailureMessage: "Server Error" });
  }
};

const getSubTaskBySubId = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("subtaskid", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ FailureMessage: "not a valid id" })
    }
    const subtask = await SubTask.findById(id).populate({ path: 'task' }).populate({ path: 'assignees.user' }).populate({ path: 'attachments.uploadedBy' }).populate({ path: 'createdBy' }).populate({path:'timeLogs'}).populate({
        path: 'comments',
        populate: { path: 'createdBy', select: 'name email profileImage avatarUrl' } // 👈 Populate inside comments
      });
    if (!subtask) {
      return res.status(404).json({ FailureMessage: "No SubTask Found" })
    }
    res.status(200).json(subtask)
  } catch (error) {
    console.log("getSubTaskBySub error", error);

    return res.status(500).json({ FailureMessage: "Server Error" });

  }
}
const fetchTeamByTaskId = async (req, res) => {
  try {
    const TaskId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(TaskId)) {
      return res.status(400).json({ FailureMessage: "not a valid id" })
    }
    const task = await Task.findById(TaskId).populate({ path: 'assignees.user' })
    if (!task) {
      return res.status(404).json({ FailureMessage: "Task not found" })
    }
    return res.status(200).json(task)
  } catch (error) {
    console.log(error);

    return res.status(500).json({ FailureMessage: "Internal Server error" })

  }
}
const updateManagerSubTaskByID = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingSubTask = await SubTask.findById(id)
      .populate("task")
      .populate("assignees.user");
    if (!existingSubTask) {
      return res.status(404).json({ FailureMessage: "SubTask not found" });
    }

    const task = await Task.findById(existingSubTask.task);
    if (!task) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }

    // ===========================
    // 🔹 STATUS VALIDATION
    // ===========================
    if (updates.status && updates.status !== existingSubTask.status) {
      const allowedForManager = ["todo", "in-progress", "review", "completed"];
      if (!allowedForManager.includes(updates.status)) {
        return res
          .status(403)
          .json({ FailureMessage: "Invalid status transition for manager." });
      }

      if (updates.status === "ready-for-review") {
        return res
          .status(403)
          .json({
            FailureMessage: "Managers cannot mark tasks as ready-for-review.",
          });
      }

      const taskWithDeps = await SubTask.findById(id).populate(
        "dependencies",
        "status"
      );

      if (!taskWithDeps) {
        return res
          .status(404)
          .json({ FailureMessage: "Sub Task not found" });
      }

      const incompleteDeps = taskWithDeps.dependencies.filter(
        (dep) => dep.status !== "completed"
      );

      if (incompleteDeps.length > 0) {
        return res.status(400).json({
          FailureMessage:
            "Cannot update status until all dependencies are completed",
          incompleteDependencies: incompleteDeps.map((d) => ({
            id: d._id,
            title: d.title,
            status: d.status,
          })),
        });
      }

      // ===========================
      // 🔹 TIMELOG LOGIC (copied & integrated)
      // ===========================
      if (updates.status === "in-progress") {
        for (let assignee of existingSubTask.assignees) {
          const existingLog = await TimeLog.findOne({
            subTask: existingSubTask._id,
            user: assignee.user,
            endTime: null,
          });

          if (!existingLog) {
            const newLog = await TimeLog.create({
              project: existingSubTask.task.project, // parent project id
              task: existingSubTask.task._id, // parent task id
              subTask: existingSubTask._id,
              user: assignee.user,
              startTime: new Date(),
              action: "started",
            });

            existingSubTask.timeLogs.push(newLog._id);
          }
        }
        await existingSubTask.save();
      }

      if (updates.status === "review" || updates.status === "completed") {
        for (let assignee of existingSubTask.assignees) {
          const openLog = await TimeLog.findOne({
            subTask: existingSubTask._id,
            user: assignee.user,
            endTime: null,
          });

          if (openLog) {
            openLog.endTime = new Date();
            openLog.duration = openLog.endTime - openLog.startTime;
            openLog.action = "completed";
            await openLog.save();
          }
        }
      }
    }

    // ===========================
    // 🔹 DATE VALIDATIONS
    // ===========================
    if (updates.startDate || updates.dueDate) {
      const updatedStart = updates.startDate
        ? new Date(updates.startDate)
        : null;
      const updatedDue = updates.dueDate ? new Date(updates.dueDate) : null;

      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.dueDate);

      if (updatedStart && updatedDue && updatedDue < updatedStart) {
        return res.status(400).json({
          FailureMessage: "You cannot set the due date before the start date",
        });
      }

      if (updatedStart && updatedStart < taskStartDate) {
        return res.status(400).json({
          FailureMessage:
            "Task start date cannot be before the project start date",
        });
      }

      if (updatedDue && updatedDue < taskStartDate) {
        return res.status(400).json({
          FailureMessage:
            "Task due date cannot be before the project start date",
        });
      }

      // if (updatedStart && updatedStart > taskEndDate) {
      //   return res.status(400).json({
      //     FailureMessage:
      //       "Task start date cannot be after the project end date",
      //   });
      // }
    }

    // ===========================
    // 🔹 UPDATE SUBTASK
    // ===========================
    const subtask = await SubTask.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("assignees.user", "name email")
      .populate("createdBy", "name email");

    await updateSubtaskProgress(subtask._id);

    // Notify assignees about manager update
    try {
      const actorName = req.user && req.user.name ? req.user.name : 'A manager';
      if (subtask && subtask.assignees && subtask.assignees.length > 0) {
        await Promise.all(
          subtask.assignees.map((a) =>
            notifyUser({
              type: 'subtask-updated',
              message: `Subtask '${subtask.title}' was updated by ${actorName}.`,
              recipientId: a.user._id || a.user,
              project: task.project,
              subTask: subtask._id,
              title: 'SubTask Updated',
              link: `/dashboard/subtask/${subtask._id}`,
              emailLink: `${process.env.FRONTEND_URL}/dashboard/subtask/${subtask._id}`,
            })
          )
        );
      }
    } catch (notifyErr) {
      console.error('Notify error (updateManagerSubTaskByID):', notifyErr);
    }

    return res.status(200).json({
      SuccessMessage: "SubTask updated successfully + TimeLogs handled",
      subtask,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

const updateEmployeeSubTaskByID = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;
    const userId = req.user._id;

    const existingSubTask = await SubTask.findById(id).populate("task");
    if (!existingSubTask) {
      return res.status(404).json({ FailureMessage: "SubTask not found" });
    }

    const task = await Task.findById(existingSubTask.task);
    if (!task) {
      return res.status(404).json({ FailureMessage: "Task not found" });
    }

    // ============= STATUS LOGIC =============
    if (updates.status && updates.status !== existingSubTask.status) {
      const taskWithDeps = await SubTask.findById(id).populate("dependencies", "status");

      const allowedForEmployee = ["todo", "in-progress", "ready-for-review"];
      if (!allowedForEmployee.includes(updates.status)) {
        return res.status(403).json({ FailureMessage: "Invalid status transition for employee." });
      }

      if (updates.status.toLowerCase() === "ready-for-review") {
        updates.status = "review";
      }

      if (!taskWithDeps) {
        return res.status(404).json({ FailureMessage: "Sub Task not found" });
      }

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

      // ===========================
      // 🔹 TimeLog Logic (added)
      // ===========================
       if(updates.status==="todo"){
       const latTimeLog=await TimeLog.find({
        subTask:existingSubTask._id,
        user:userId
      })
      // res.status(200).json(latestTimeLog)
  
      const latestTimeLog=latTimeLog[latTimeLog.length-1]
      console.log(latestTimeLog);
      if(latestTimeLog.action=='paused'){
        return res.status(400).json({FailureMessage:"please finish the break first"})
      }
      
    }
      if (updates.status === "in-progress") {
        // Start a new time log if none is running
        const existingLog = await TimeLog.findOne({
          subTask: existingSubTask._id,
          user: userId,
          endTime: null,
        });

        if (!existingLog) {
          const newLog = await TimeLog.create({
            project: existingSubTask.task.project,
            task: existingSubTask.task._id,
            subTask: existingSubTask._id,
            user: userId,
            startTime: new Date(),
            action: "started",
          });

          existingSubTask.timeLogs.push(newLog._id);
          await existingSubTask.save();
        }
      }

      if (updates.status === "review") {
        const userLogs = await TimeLog.find({
          subTask: existingSubTask._id,
          user: userId,
        });

        const latestLog = userLogs[userLogs.length - 1];

        if (latestLog && latestLog.action === "paused") {
          return res.status(400).json({
            FailureMessage: "Please finish the break first",
          });
        }

        const openLog = await TimeLog.findOne({
          subTask: existingSubTask._id,
          user: userId,
          endTime: null,
        });

        if (openLog) {
          openLog.endTime = new Date();
          openLog.duration = openLog.endTime - openLog.startTime;
          openLog.action = "completed";
          await openLog.save();
        }
      }
    }

    // ✅ Date validation (unchanged)
    if (updates.startDate || updates.dueDate) {
      const updatedSubTaskstartDate = updates.startDate ? new Date(updates.startDate) : null;
      const updatedSubTaskDueDate = updates.dueDate ? new Date(updates.dueDate) : null;

      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.dueDate);

      if (updatedSubTaskstartDate && updatedSubTaskDueDate && updatedSubTaskDueDate < updatedSubTaskstartDate) {
        return res.status(400).json({ FailureMessage: "You cannot set the due date before the start date" });
      }

      if (updatedSubTaskstartDate && updatedSubTaskstartDate < taskStartDate) {
        return res.status(400).json({ FailureMessage: "Task start date cannot be before the project start date" });
      }

      if (updatedSubTaskDueDate && updatedSubTaskDueDate < taskStartDate) {
        return res.status(400).json({ FailureMessage: "Task due date cannot be before the project start date" });
      }

      // if (updatedSubTaskstartDate && updatedSubTaskstartDate > taskEndDate) {
      //   return res.status(400).json({ FailureMessage: "Task start date cannot be after the project end date" });
      // }
    }

    // ===========================
    // 🔹 Update SubTask
    // ===========================
    const subtask = await SubTask.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("assignees.user", "name email")
      .populate("createdBy", "name email");

    await updateSubtaskProgress(subtask._id);

    // Notify manager (task creator) about employee update
    try {
      const actorName = req.user && req.user.name ? req.user.name : 'An employee';
      const updatedSubtask = await SubTask.findById(id).populate('assignees.user').populate('createdBy');
      const parentTask = await Task.findById(updatedSubtask.task).populate('createdBy');
      if (parentTask && parentTask.createdBy && parentTask.createdBy._id) {
        await notifyUser({
          type: 'subtask-status-updated',
          message: `Subtask '${updatedSubtask.title}' status was updated by ${actorName}.`,
          recipientId: parentTask.createdBy._id,
          project: parentTask.project,
          subTask: updatedSubtask._id,
          title: 'SubTask Status Updated',
          link: `/dashboard/subtask/${updatedSubtask._id}`,
          emailLink: `${process.env.FRONTEND_URL}/dashboard/subtask/${updatedSubtask._id}`,
        });
      }
    } catch (notifyErr) {
      console.error('Notify error (updateEmployeeSubTaskByID):', notifyErr);
    }

    return res.status(200).json({
      SuccessMessage: "task updated successfully ",
      subtask,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

//delete sub task
const deleteSubTaskById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ FailureMessage: "not a valid id" })
    }
    const subtask = await SubTask.findById(id);
    if (!subtask) {
      return res.status(404).json({ FailureMessage: "No Task Found" })
    }
    // capture actor name
    const actorName = req.user && req.user.name ? req.user.name : 'A user';

    // populate assignees and createdBy for notifications
    const populated = await SubTask.findById(id).populate('assignees.user').populate('createdBy');

    await SubTask.deleteOne({ _id: subtask._id })

    // notify assignees and creator
    try {
      const notifyList = [];
      if (populated && populated.assignees && populated.assignees.length > 0) {
        populated.assignees.forEach(a => {
          notifyList.push(notifyUser({
            type: 'subtask-deleted',
            message: `Subtask '${populated.title}' was deleted by ${actorName}.`,
            recipientId: a.user._id || a.user,
            project: populated.task ? populated.task.project : undefined,
            subTask: populated._id,
            title: 'SubTask Deleted',
            link: `/dashboard/subtask/${populated._id}`,
            emailLink: `${process.env.FRONTEND_URL}/dashboard/subtask/${populated._id}`,
          }));
        });
      }

      if (populated && populated.createdBy && populated.createdBy._id) {
        notifyList.push(notifyUser({
          type: 'subtask-deleted',
          message: `Subtask '${populated.title}' was deleted by ${actorName}.`,
          recipientId: populated.createdBy._id,
          project: populated.task ? populated.task.project : undefined,
          subTask: populated._id,
          title: 'SubTask Deleted',
          link: `/dashboard/subtask/${populated._id}`,
          emailLink: `${process.env.FRONTEND_URL}/dashboard/subtask/${populated._id}`,
        }));
      }

      await Promise.all(notifyList);
    } catch (notifyErr) {
      console.error('Notify error (deleteSubTaskById):', notifyErr);
    }

    res.status(200).json({ SuccessMessage: "task deleted successfully" })
  } catch (error) {
    res.status(500).json({ FailureMessage: "Internal server error" })

  }
}
const updateEmployeeSubTaskStatusById = async (req, res) => {
  try {
    let { Id, status } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return res.status(400).json({ FailureMessage: "Not a valid id" });
    }

    const subtask = await SubTask.findById(Id).populate("task");
    if (!subtask) {
      return res.status(404).json({ FailureMessage: "No task found" });
    }

    // ❌ Restriction
    if (status === "completed") {
      return res.status(403).json({ FailureMessage: "Employees cannot mark tasks as Completed directly." });
    }

    // ✅ Allowed
    const allowedForEmployee = ["todo", "in-progress", "ready-for-review"];
    if (!allowedForEmployee.includes(status)) {
      return res.status(403).json({ FailureMessage: "Invalid status transition for employee." });
    }

    if (status.toLowerCase() === "ready-for-review") {
      status = "review";
    }

    // =====================
    // 🔹 TimeLog Logic
    // =====================
    if(status==="todo"){
       const latTimeLog=await TimeLog.find({
        subTask:subtask._id,
        user:userId
      })
      // res.status(200).json(latestTimeLog)
  
      const latestTimeLog=latTimeLog[latTimeLog.length-1]
      console.log(latestTimeLog);
      if(latestTimeLog.action=='paused'){
        return res.status(400).json({FailureMessage:"please finish the break first"})
      }
      
    }
    if (status === "in-progress") {
      // Check if already running timelog
      const existingLog = await TimeLog.findOne({
        subTask: subtask._id,
        user: userId,
        endTime: null
      });

      if (!existingLog) {
        const newLog = await TimeLog.create({
          project: subtask.task.project,   // parent project id
          task: subtask.task._id,
          subTask: subtask._id,
          user: userId,
          startTime: new Date(),
          action: "started"
        });

        subtask.timeLogs.push(newLog._id);
        await subtask.save();
      }
    }


    if (status === "review") {
      const latTimeLog=await TimeLog.find({
        subTask:subtask._id,
        user:userId
      })
      // res.status(200).json(latestTimeLog)
  
      const latestTimeLog=latTimeLog[latTimeLog.length-1]
      console.log(latestTimeLog);
      if(latestTimeLog.action=='paused'){
        return res.status(400).json({FailureMessage:"please finish the break first"})
      }
      
      // Close the open log
      const openLog = await TimeLog.findOne({
        subTask: subtask._id,
        user: userId,
        endTime: null,
        
      });
    
      if (openLog) {
        openLog.endTime = new Date();
        openLog.duration = openLog.endTime - openLog.startTime; // ms
        openLog.action = "completed";
        await openLog.save();
      }
      //  console.log("action==================================================================",openLog.action);
    }
    // try {
    //     await handleSubtaskTimeLogStatusChange(subtask, userId, status,res);

    // } catch (error) {
    //   return res.status(400).json({FailureMessage:error.message})
      
    // }
  
    // =====================
    // 🔹 Update SubTask Status
    // =====================
    await SubTask.updateOne(
      { _id: Id },
      { $set: { status: status } }
    );

    await updateSubtaskProgress(subtask._id);

    // Notify manager (task creator) about employee status change
    try {
      const actorName = req.user && req.user.name ? req.user.name : 'An employee';
      const updated = await SubTask.findById(Id).populate('task');
      const parentTask = updated && updated.task ? await Task.findById(updated.task).populate('createdBy') : null;
      if (parentTask && parentTask.createdBy && parentTask.createdBy._id) {
        await notifyUser({
          type: 'subtask-status-updated',
          message: `Subtask '${updated.title}' status was changed to '${status}' by ${actorName}.`,
          recipientId: parentTask.createdBy._id,
          project: parentTask.project,
          subTask: updated._id,
          title: 'SubTask Status Updated',
          link: `/dashboard/milestone/${parentTask._id}/board`,
          emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${parentTask._id}/board`,
        });
      }
    } catch (notifyErr) {
      console.error('Notify error (updateEmployeeSubTaskStatusById):', notifyErr);
    }

    return res.status(200).json({ SuccessMessage: "Status updated + TimeLog updated" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ FailureMessage: "Internal server error" });
  }
};


const updateManagerSubTaskStatusById = async (req, res) => {
  try {
    let { Id, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(Id)) {
      return res.status(400).json({ FailureMessage: "Not a valid id" });
    }

    const subtask = await SubTask.findById(Id).populate("task").populate("assignees.user");
    if (!subtask) {
      return res.status(404).json({ FailureMessage: "No task found" });
    }

    if (status === "ready-for-review") {
      return res.status(403).json({ FailureMessage: "Managers cannot mark tasks as ready-for-review." });
    }

    const allowedForManager = ["todo", "in-progress", "review", "completed"];
    if (!allowedForManager.includes(status)) {
      return res.status(403).json({ FailureMessage: "Invalid status transition for manager." });
    }

    // =====================
    // 🔹 Timelog Logic
    // =====================
    if (status === "in-progress") {
      for (let assignee of subtask.assignees) {
        
        const existingLog = await TimeLog.findOne({
          subTask: subtask._id,
          user: assignee.user,
          endTime: null
        });

        if (!existingLog) {
          const newLog = await TimeLog.create({
            project: subtask.task.project,   // parent project id
            task: subtask.task._id,          // parent task id
            subTask: subtask._id,
            user: assignee.user,
            startTime: new Date(),
            action: "started"
          });

          subtask.timeLogs.push(newLog._id);
        }
      }
      await subtask.save();
    }

    if (status === "review" || status === "completed") {
      for (let assignee of subtask.assignees) {
       
        let log = await TimeLog.findOne({
          subTask: subtask._id,
          user: assignee.user,
          endTime: null
        });

        if (log) {
          log.endTime = new Date();
          log.duration = log.endTime - log.startTime;
          log.action = "completed";
          await log.save();
        }
      }
    }

    // =====================
    // 🔹 Update SubTask Status
    // =====================
    await SubTask.updateOne(
      { _id: Id },
      { $set: { status: status } }
    );

    await updateSubtaskProgress(subtask._id);

    const UpdatedData = await SubTask.find({ task: subtask.task }).populate("task")
    // Notify assignees about manager status change
    try {
      const actorName = req.user && req.user.name ? req.user.name : 'A manager';
      if (subtask && subtask.assignees && subtask.assignees.length > 0) {
        await Promise.all(
          subtask.assignees.map(a =>
            notifyUser({
              type: 'subtask-status-updated-by-manager',
              message: `Subtask '${subtask.title}' status was changed to '${status}' by ${actorName}.`,
              recipientId: a.user._id || a.user,
              project: subtask.task ? subtask.task.project : undefined,
              subTask: subtask._id,
              title: 'SubTask Status Updated',
              link: `/dashboard/milestone/${subtask.rask}/board`,
              emailLink: `${process.env.FRONTEND_URL}/dashboard/milestone/${subtask.task}/board`,
            })
          )
        );
      }
    } catch (notifyErr) {
      console.error('Notify error (updateManagerSubTaskStatusById):', notifyErr);
    }

    return res.status(200).json({
      SuccessMessage: "Status updated successfully + TimeLogs handled",
      UpdatedData
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ FailureMessage: "Internal server error" });
  }
};


module.exports = { CreateSubTask, getSubTasksByTaskId, getSubTaskBySubId, fetchTeamByTaskId, updateManagerSubTaskByID,updateEmployeeSubTaskByID, deleteSubTaskById, updateEmployeeSubTaskStatusById,updateManagerSubTaskStatusById };
