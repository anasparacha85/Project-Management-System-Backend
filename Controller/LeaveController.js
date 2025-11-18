const Leave = require('../Modal/LeaveModal');
const User = require('../Modal/User');
const { notifyUser } = require('../helper/notifyUser');
const mongoose = require('mongoose');

// ============================================
// 📝 EMPLOYEE: Request Leave
// ============================================
const requestLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, attachments } = req.body;
    const employeeId = req.user._id;

    // ✅ Validation
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        FailureMessage: 'Leave type, start date, end date, and reason are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        FailureMessage: 'End date cannot be before start date'
      });
    }

    // ✅ Calculate number of days (excluding weekends)
    const numberOfDays = calculateWorkingDays(start, end);

    if (numberOfDays <= 0) {
      return res.status(400).json({
        FailureMessage: 'Leave period must include at least one working day'
      });
    }

    // ✅ Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employee: employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        FailureMessage: 'You already have a leave request in this period'
      });
    }

    // ✅ Create leave request
    const newLeave = new Leave({
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason,
      attachments: attachments || [],
      status: 'pending'
    });

    await newLeave.save();

    // 🔔 Notify manager
    try {
      const employee = await User.findById(employeeId);
      const managers = await User.find({ role: 'manager' });

      await Promise.all(
        managers.map(manager =>
          notifyUser({
            type: 'leave-requested',
            message: `${employee.name} has requested a leave from ${start.toDateString()} to ${end.toDateString()} (${numberOfDays} days)`,
            recipientId: manager._id,
            title: 'New Leave Request',
            link: `/dashboard/leave-requests`,
            emailLink: `${process.env.FRONTEND_URL}/dashboard/leave-requests`
          })
        )
      );
    } catch (notifyErr) {
      console.error('Notify error (requestLeave):', notifyErr);
    }

    return res.status(201).json({
      SuccessMessage: 'Leave request submitted successfully',
      leave: newLeave
    });
  } catch (error) {
    console.error('requestLeave error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// ✅ MANAGER: Approve Leave
// ============================================
const approveLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const managerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(leaveId)) {
      return res.status(400).json({ FailureMessage: 'Invalid leave ID' });
    }

    const leave = await Leave.findById(leaveId).populate('employee');

    if (!leave) {
      return res.status(404).json({ FailureMessage: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        FailureMessage: `Cannot approve a ${leave.status} leave request`
      });
    }

    // ✅ Update leave
    leave.status = 'approved';
    leave.approvedBy = managerId;
    leave.approvalDate = new Date();
    await leave.save();

    // 🔔 Notify employee
    try {
      const manager = await User.findById(managerId);
      await notifyUser({
        type: 'leave-approved',
        message: `Your leave request from ${leave.startDate.toDateString()} to ${leave.endDate.toDateString()} has been approved by ${manager.name}`,
        recipientId: leave.employee._id,
        title: 'Leave Approved',
        link: `/dashboard/my-leaves`,
        emailLink: `${process.env.FRONTEND_URL}/dashboard/my-leaves`
      });
    } catch (notifyErr) {
      console.error('Notify error (approveLeave):', notifyErr);
    }

    return res.status(200).json({
      SuccessMessage: 'Leave approved successfully',
      leave
    });
  } catch (error) {
    console.error('approveLeave error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// ❌ MANAGER: Reject Leave
// ============================================
const rejectLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { rejectionReason } = req.body;
    const managerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(leaveId)) {
      return res.status(400).json({ FailureMessage: 'Invalid leave ID' });
    }

    if (!rejectionReason) {
      return res.status(400).json({ FailureMessage: 'Rejection reason is required' });
    }

    const leave = await Leave.findById(leaveId).populate('employee');

    if (!leave) {
      return res.status(404).json({ FailureMessage: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        FailureMessage: `Cannot reject a ${leave.status} leave request`
      });
    }

    // ✅ Update leave
    leave.status = 'rejected';
    leave.approvedBy = managerId;
    leave.approvalDate = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    // 🔔 Notify employee
    try {
      const manager = await User.findById(managerId);
      await notifyUser({
        type: 'leave-rejected',
        message: `Your leave request has been rejected by ${manager.name}. Reason: ${rejectionReason}`,
        recipientId: leave.employee._id,
        title: 'Leave Rejected',
        link: `/dashboard/my-leaves`,
        emailLink: `${process.env.FRONTEND_URL}/dashboard/my-leaves`
      });
    } catch (notifyErr) {
      console.error('Notify error (rejectLeave):', notifyErr);
    }

    return res.status(200).json({
      SuccessMessage: 'Leave rejected successfully',
      leave
    });
  } catch (error) {
    console.error('rejectLeave error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// 📋 EMPLOYEE: Get My Leaves
// ============================================
const getMyLeaves = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { status, leaveType } = req.query;

    let filter = { employee: employeeId };

    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;

    const leaves = await Leave.find(filter)
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      SuccessMessage: 'Leaves fetched successfully',
      leaves
    });
  } catch (error) {
    console.error('getMyLeaves error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// 📋 MANAGER: Get All Leave Requests
// ============================================
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employeeId } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (employeeId) filter.employee = employeeId;

    const leaves = await Leave.find(filter)
      .populate('employee', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      SuccessMessage: 'Leave requests fetched successfully',
      leaves
    });
  } catch (error) {
    console.error('getAllLeaveRequests error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// 📊 MANAGER: Get Team Leave Summary
// ============================================
const getTeamLeaveSummary = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });

    const summary = await Promise.all(
      employees.map(async (emp) => {
        const approvedLeaves = await Leave.find({
          employee: emp._id,
          status: 'approved'
        });

        const totalLeaveDays = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);

        const pendingLeaves = await Leave.find({
          employee: emp._id,
          status: 'pending'
        });

        return {
          employeeId: emp._id,
          employeeName: emp.name,
          employeeEmail: emp.email,
          approvedLeaveDays: totalLeaveDays,
          pendingRequests: pendingLeaves.length,
          upcomingLeaves: approvedLeaves.filter(l => new Date(l.startDate) > new Date())
        };
      })
    );

    return res.status(200).json({
      SuccessMessage: 'Team leave summary fetched successfully',
      summary
    });
  } catch (error) {
    console.error('getTeamLeaveSummary error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// 🗑️ EMPLOYEE: Cancel Leave Request
// ============================================
const cancelLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const employeeId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(leaveId)) {
      return res.status(400).json({ FailureMessage: 'Invalid leave ID' });
    }

    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ FailureMessage: 'Leave request not found' });
    }

    if (leave.employee.toString() !== employeeId.toString()) {
      return res.status(403).json({ FailureMessage: 'Unauthorized' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        FailureMessage: 'Can only cancel pending leave requests'
      });
    }

    await Leave.deleteOne({ _id: leaveId });

    return res.status(200).json({
      SuccessMessage: 'Leave request cancelled successfully'
    });
  } catch (error) {
    console.error('cancelLeaveRequest error:', error);
    return res.status(500).json({ FailureMessage: 'Server Error' });
  }
};

// ============================================
// 🛠️ HELPER: Calculate Working Days
// ============================================
function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

module.exports = {
  requestLeave,
  approveLeave,
  rejectLeave,
  getMyLeaves,
  getAllLeaveRequests,
  getTeamLeaveSummary,
  cancelLeaveRequest
};