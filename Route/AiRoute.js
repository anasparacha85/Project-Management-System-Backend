const express=require('express')
const AiRouter=express.Router()
const AiController=require('../Controller/AiController')
AiRouter.route('/generate-description').post(AiController.GenerateDescription)
module.exports=AiRouter