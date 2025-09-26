const express=require('express')
const UserRouter=express.Router()
const UserController=require('../Controller/UserController')
const requireAuth = require('../Middleware/requireAuth')

UserRouter.route('/registerEmployee').post(UserController.registerEmployee)
UserRouter.route('/registerManager').post(UserController.registerManager)
UserRouter.route('/loginEmployee').post(UserController.loginEmployee)
UserRouter.route('/loginManager').post(UserController.loginManager)
UserRouter.route('/logout').get(UserController.logout)
UserRouter.route('/user').get(requireAuth,UserController.getUserData)
module.exports=UserRouter