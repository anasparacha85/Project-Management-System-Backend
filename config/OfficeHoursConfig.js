/**
 * Default Office Hours Configuration
 * This can be extended to support per-company settings
 */

const officeHoursConfig = {
  // Default office hours (will be configurable later per company)
  default: {
    startHour: 9,      // 9 AM
    endHour: 21,       // 6 PM
    startMinute: 0,
    endMinute: 0,
    workingDays: [1, 2, 3, 4, 5], // Monday to Friday (0 = Sunday)
    breakTime: 1 // hours (lunch break)
  }
};

/**
 * Get office hours for a user/company
 * Later, this can query company-specific settings
 */
function getOfficeHours(companyId = null) {
  return officeHoursConfig.default;
}

/**
 * Check if a time is within office hours
 */
function isWithinOfficeHours(dateTime, officeHours = null) {
  const config = officeHours || officeHoursConfig.default;
  const date = new Date(dateTime);
  
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();

  // Check if it's a working day
  if (!config.workingDays.includes(dayOfWeek)) {
    return false;
  }

  // Check if it's within working hours
  const startTime = config.startHour * 60 + config.startMinute;
  const endTime = config.endHour * 60 + config.endMinute;
  const currentTime = hour * 60 + minute;

  return currentTime >= startTime && currentTime < endTime;
}

/**
 * Calculate billable hours between two times
 * Only counts time within office hours, excludes breaks
 */
function calculateBillableHours(startTime, endTime, officeHours = null) {
  const config = officeHours || officeHoursConfig.default;
  let billableMs = 0;
  
  let current = new Date(startTime);
  const end = new Date(endTime);

  while (current < end) {
    if (isWithinOfficeHours(current, config)) {
      billableMs += 60000; // Add 1 minute
      current.setMinutes(current.getMinutes() + 1);
    } else {
      current.setMinutes(current.getMinutes() + 1);
    }
  }

  return billableMs / (1000 * 60 * 60); // Convert to hours
}

/**
 * Get work hours for a day (9 AM to 6 PM = 9 hours, minus break = 8 hours)
 */
function getWorkHoursPerDay(officeHours = null) {
  const config = officeHours || officeHoursConfig.default;
  return (config.endHour - config.startHour) - config.breakTime;
}

module.exports = {
  officeHoursConfig,
  getOfficeHours,
  isWithinOfficeHours,
  calculateBillableHours,
  getWorkHoursPerDay
};