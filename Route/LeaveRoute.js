const express = require('express');
const {
  requestLeave,
  approveLeave,
  rejectLeave,
  getMyLeaves,
  getAllLeaveRequests,
  getTeamLeaveSummary,
  cancelLeaveRequest
} = require('../Controller/LeaveController');
const requireAuth = require('../Middleware/requireAuth');

const LeaveRouter = express.Router();

// ============================================
// 🔐 EMPLOYEE ROUTES (Protected by Auth)
// ============================================

// 📝 Request a leave
LeaveRouter.route('/request').post( requireAuth, requestLeave);

// 📋 Get my leaves
LeaveRouter.route('/my-leaves').get(requireAuth, getMyLeaves);

// 🗑️ Cancel leave request
LeaveRouter.route('/cancel/:leaveId').delete( requireAuth, cancelLeaveRequest);

// ============================================
// 🔐 MANAGER ROUTES (Protected by Auth)
// ============================================

// ✅ Approve a leave
LeaveRouter.route('/approve/:leaveId').patch( requireAuth, approveLeave);

// ❌ Reject a leave
LeaveRouter.route('/reject/:leaveId').put( requireAuth, rejectLeave);

// 📋 Get all leave requests
LeaveRouter.route('/all-requests').get( requireAuth, getAllLeaveRequests);

// 📊 Get team leave summary
LeaveRouter.route('/team-summary').get( requireAuth, getTeamLeaveSummary);

module.exports = LeaveRouter;