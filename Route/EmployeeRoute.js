const express=require('express')
const EmployeeRouter=express.Router()
const EmployeeController=require('../Controller/EmployeeController');
const requireAuth = require('../Middleware/requireAuth');
const requireRole = require('../Middleware/requiredrole');
EmployeeRouter.route('/getEmployeeProjects').get(requireAuth,requireRole('employee'),EmployeeController.getEmployeeProjects)
EmployeeRouter.route('/getEmployeeTasksByProject/:id').get(requireAuth,requireRole('employee'),EmployeeController.getEmployeeTasksByProject)
EmployeeRouter.route('/getEmployeeSubTasksByTask/:id').get(requireAuth,requireRole('employee'),EmployeeController.getEmployeeSubTasksByTask)
EmployeeRouter.route('/getEmployeeTaskReport')
  .post(requireAuth, EmployeeController.getEmployeeMilestoneReportByEmployeeId);
EmployeeRouter.route('/getEmployeeProjectReport')
  .post(requireAuth, EmployeeController.getEmployeeReportByProjectId);
EmployeeRouter.route('/takeBreak').post(requireAuth,EmployeeController.pauseTimeLog)
EmployeeRouter.route('/resumeBreak').post(requireAuth,EmployeeController.resumeTimeLog)
module.exports=EmployeeRouter