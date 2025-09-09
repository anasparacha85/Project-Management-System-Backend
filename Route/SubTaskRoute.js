const express=require('express')
const SubTaskRouter=express.Router()
const SubTaskController=require('../Controller/SubTaskController')
const requireAuth = require('../Middleware/requireAuth')
const upload = require('../config/cloudinaryconfig')
SubTaskRouter.route('/create-subTask/:id').post(requireAuth,upload.array("attachments"),SubTaskController.CreateSubTask)
SubTaskRouter.route('/getSubTasks/:id').get(requireAuth,SubTaskController.getSubTasksByTaskId)
SubTaskRouter.route('/getSubTaskById/:id').get(requireAuth,SubTaskController.getSubTaskBySubId)
SubTaskRouter.route('/getTeamByTaskId/:id').get(requireAuth,SubTaskController.fetchTeamByTaskId)
SubTaskRouter.route('/updateSubTaskById/:id').put(requireAuth,SubTaskController.updateSubTaskByID)
SubTaskRouter.route('/deleteSubTaskById/:id').delete(requireAuth,SubTaskController.deleteSubTaskById)
SubTaskRouter.route('/updateSubTaskStatus').patch(requireAuth,SubTaskController.updateSubTaskStatusById)
module.exports=SubTaskRouter


