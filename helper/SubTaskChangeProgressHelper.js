// utils/handleSubtaskTimeLogStatusChange.js
const TimeLog = require("../Modal/Timelog");
// const SubTask = require("../models/SubTask");

const  handleSubtaskTimeLogStatusChange=async(subtask, userId, newStatus,res)=> {
  // -------------------------
  // When subtask starts
  // -------------------------
  if (newStatus === "in-progress") {
    const existingLog = await TimeLog.findOne({
      subTask: subtask._id,
      user: userId,
      endTime: null
    });

    if (!existingLog) {
      const newLog = await TimeLog.create({
        project: subtask.task.project,
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

  // -------------------------
  // When subtask goes into review
  // -------------------------
  if (newStatus === "review") {
    const latestLog = await TimeLog.findOne({
      subTask: subtask._id,
      user: userId,
      endTime: null
    }).sort({ startTime: -1 });

    if (latestLog) {
      if (latestLog.action === "paused") {
        throw new Error("please finish the break first")
      }

      latestLog.endTime = new Date();
      latestLog.duration = latestLog.endTime - latestLog.startTime;
      latestLog.action = "completed";
      await latestLog.save();
    }
  }
}

module.exports =  handleSubtaskTimeLogStatusChange ;
