const express=require('express')
const requireAuth=require('../Middleware/requireAuth')
const CommentsController=require('../Controller/CommentsController')
const CommentsRouter=express.Router()
CommentsRouter.route('/post-comment').post(requireAuth,CommentsController.addComment)
CommentsRouter.route('/get-comments/:type/:targetId').get(requireAuth,CommentsController.getAllCommentsByTargets)
module.exports=CommentsRouter