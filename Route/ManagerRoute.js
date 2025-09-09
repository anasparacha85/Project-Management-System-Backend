const express=require('express')
const ManagerRouter=express.Router()
const ManagerController=require('../Controller/ManagerController')
const requireAuth = require('../Middleware/requireAuth')
const upload = require('../config/cloudinaryconfig')


ManagerRouter.route('/fetchAllEmployees').get(requireAuth,ManagerController.fetchAllEmployees)
ManagerRouter.route('/fetchAllManagers').get(requireAuth,ManagerController.fetchAllManagers)
ManagerRouter.route('/fetchEmployees').get(requireAuth,ManagerController.fetchEmployeesByQuery)
ManagerRouter.route('/createProject').post(requireAuth,upload.array('files',10),ManagerController.createProject)
ManagerRouter.route('/fetchAllProjects').get(requireAuth,ManagerController.fetchProjectByManagerId)
ManagerRouter.route('/InviteTeam').post(requireAuth,ManagerController.InviteMembersByProjectId)
module.exports=ManagerRouter