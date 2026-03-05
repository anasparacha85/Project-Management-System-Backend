const express=require('express')
const AiRouter=express.Router()
const AiController=require('../Controller/AiController')
const requireAuth = require('../Middleware/requireAuth')
const requireRole = require('../Middleware/requiredrole')


// Existing endpoint
AiRouter.route('/generate-description').post(AiController.GenerateDescription)

// New AI automation endpoints
AiRouter.route('/generate-project-breakdown')
  .post(
    requireAuth,
    requireRole('manager'),
    AiController.generateProjectBreakdownController
  )

AiRouter.route('/generate-tasks')
  .post(
    requireAuth,
    requireRole('manager'),
    AiController.generateTasksController
  )

module.exports=AiRouter