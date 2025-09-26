const express=require('express')
const SubTaskRouter=express.Router()
const SubTaskController=require('../Controller/SubTaskController')
const requireAuth = require('../Middleware/requireAuth')
const upload = require('../config/cloudinaryconfig')
const requireRole = require('../Middleware/requiredrole')
SubTaskRouter.route('/create-subTask/:id').post(requireAuth,upload.array("attachments"),SubTaskController.CreateSubTask)
SubTaskRouter.route('/getSubTasks/:id').get(requireAuth,SubTaskController.getSubTasksByTaskId)
SubTaskRouter.route('/getSubTaskById/:id').get(requireAuth,SubTaskController.getSubTaskBySubId)
SubTaskRouter.route('/getTeamByTaskId/:id').get(requireAuth,SubTaskController.fetchTeamByTaskId)
SubTaskRouter.route('/updateManagerSubTaskById/:id').put(requireAuth,requireRole('manager'),SubTaskController.updateManagerSubTaskByID)
SubTaskRouter.route('/updateEmployeeSubTaskById/:id').put(requireAuth,requireRole('employee'),SubTaskController.updateEmployeeSubTaskByID)

SubTaskRouter.route('/deleteSubTaskById/:id').delete(requireAuth,SubTaskController.deleteSubTaskById)
SubTaskRouter.route('/updateManagerSubTaskStatus').patch(requireAuth,requireRole('manager'),SubTaskController.updateManagerSubTaskStatusById)
SubTaskRouter.route('/updateEmployeeSubTaskStatus').patch(requireAuth,requireRole('employee'),SubTaskController.updateEmployeeSubTaskStatusById)
module.exports=SubTaskRouter


