const express=require('express')
const taskRouter=express.Router()
const TaskController=require('../Controller/TaskController')
const requireAuth = require('../Middleware/requireAuth')
const upload = require('../config/cloudinaryconfig')

taskRouter.route('/createTask/:id').post(requireAuth,upload.array('attachments',3),TaskController.createTask)
taskRouter.route('/getTeam/:id').get(requireAuth,TaskController.fetchMembersByProjectid)
taskRouter.route('/getTasks/:id').get(requireAuth,TaskController.fetchtasksbyProjectId)
taskRouter.route('/getTaskById/:id').get(requireAuth,TaskController.fetchTaskByID)
taskRouter.route('/updateTaskById/:id').put(requireAuth,TaskController.updateManagerTaskByID)
taskRouter.route('/updateEmployeeTaskById/:id').put(requireAuth,TaskController.updateEmployeeTaskByID)
taskRouter.route('/deleteTaskById/:id').delete(requireAuth,TaskController.deleteTaskById)
taskRouter.route('/report/:id').get( requireAuth,TaskController.fetchMilestoneReportById);
module.exports=taskRouter