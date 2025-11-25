
const Leave = require('../Modal/LeaveModal');
const TimeLog = require('../Modal/Timelog');
const { isWithinOfficeHours, calculateBillableHours, getOfficeHours } = require('../config/OfficeHoursConfig');

/**
 * Check if employee is on leave on a specific date
 */
async function isEmployeeOnLeave(employeeId, date) {
  const checkDate = new Date(date);
  // Normalize check date to local day boundaries to avoid time component/timezone issues
  const startOfDay = new Date(checkDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(checkDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Find any approved leave that overlaps the entire day
  const leave = await Leave.findOne({
    employee: employeeId,
    status: 'approved',
    startDate: { $lte: endOfDay },
    endDate: { $gte: startOfDay }
  });
  console.log(leave,"===leave===");

  if (!leave) {
    // Helpful debug info to diagnose why a matching leave wasn't found
    // (this can be noisy in production; consider gating on an env var)
    try {
      console.debug('[isEmployeeOnLeave] No approved leave found for:', {
        employeeId: String(employeeId),
        checkDate: checkDate.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });

      // Also show any leave (regardless of status) that overlaps the day to help spot status mismatches
      const anyLeave = await Leave.findOne({
        employee: employeeId,
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay }
      });
      if (anyLeave) {
        console.debug('[isEmployeeOnLeave] Found overlapping leave but status is', anyLeave.status, 'leaveId=', anyLeave._id);
      }
    } catch (dbgErr) {
      console.debug('[isEmployeeOnLeave] debug query error', dbgErr);
    }
  }

  return !!leave;
}

/**
 * Validate time log entry - Check if within office hours
 */
async function validateTimeLogEntry(startTime, endTime, employeeId) {
  const officeHours = getOfficeHours();
  
  // Check if employee is on leave
  const onLeave = await isEmployeeOnLeave(employeeId, startTime);
  if (onLeave) {
    return {
      valid: false,
      message: 'Cannot log time on an approved leave day'
    };
  }

  // Check if start time is within office hours
  if (!isWithinOfficeHours(startTime, officeHours)) {
    return {
      valid: false,
      message: `Start time must be within office hours (${officeHours.startHour}:${String(officeHours.startMinute).padStart(2, '0')} - ${officeHours.endHour}:${String(officeHours.endMinute).padStart(2, '0')})`
    };
  }

  // Check if end time is within office hours
  if (!isWithinOfficeHours(endTime, officeHours)) {
    return {
      valid: false,
      message: `End time must be within office hours (${officeHours.startHour}:${String(officeHours.startMinute).padStart(2, '0')} - ${officeHours.endHour}:${String(officeHours.endMinute).padStart(2, '0')})`
    };
  }

  return { valid: true };
}

/**
 * Calculate duration considering only office hours
 */
function calculateDurationInOfficeHours(startTime, endTime, officeHours = null) {
  const billableHours = calculateBillableHours(startTime, endTime, officeHours);
  return billableHours * 60 * 60 * 1000; // Convert back to milliseconds
}

/**
 * Create a time log entry with office hours validation
 */
async function createTimeLogEntry(projectId, taskId, subTaskId, userId, startTime, action = 'started') {
  try {
    // Validate
    const validation = await validateTimeLogEntry(startTime, new Date(), userId);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const newLog = new TimeLog({
      project: projectId,
      task: taskId,
      subTask: subTaskId,
      user: userId,
      startTime,
      action
    });

    await newLog.save();
    return newLog;
  } catch (error) {
    throw error;
  }
}

/**
 * End a time log entry with office hours calculation
 */
async function endTimeLogEntry(timeLogId) {
  try {
    const timeLog = await TimeLog.findById(timeLogId);
    if (!timeLog) {
      throw new Error('Time log not found');
    }

    if (timeLog.endTime) {
      throw new Error('Time log already ended');
    }

    const endTime = new Date();
    const officeHours = getOfficeHours();

    // Validate end time is within office hours
    const validation = await validateTimeLogEntry(timeLog.startTime, endTime, timeLog.user);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    timeLog.endTime = endTime;
    timeLog.duration = calculateDurationInOfficeHours(timeLog.startTime, endTime, officeHours);
    timeLog.action = 'completed';
    
    await timeLog.save();
    return timeLog;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  isEmployeeOnLeave,
  validateTimeLogEntry,
  calculateDurationInOfficeHours,
  createTimeLogEntry,
  endTimeLogEntry
};