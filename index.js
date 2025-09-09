const express=require('express')
const cors=require('cors')
const connectDb = require('./config/db')
const cookieParser=require('cookie-parser')
const UserRouter = require('./Route/UserRoute')
const ManagerRouter = require('./Route/ManagerRoute')
const taskRouter = require('./Route/TaskRoute')
const ProjectRouter = require('./Route/ProjectRoute')
const SubTaskRouter = require('./Route/SubTaskRoute')

require('dotenv').config()

const server=express()
server.use(cors({origin:`${process.env.FRONTEND_URL}`,credentials:true}))
server.use(express.json())
server.use(cookieParser())
server.get("/",(req,res)=>{
    res.status(200).json({SuccessMssage:"server started"})

})
console.log(process.env.CLOUDINARY_API_KEY ,process.env.CLOUDINARY_API_SECRET,process.env.CLOUDINARY_CLOUD_NAME);

server.use('/api/auth',UserRouter)
server.use('/api/manager',ManagerRouter)
server.use('/api/project',ProjectRouter)
server.use('/api/tasks',taskRouter)
server.use('/api/subTask',SubTaskRouter)

const PORT=process.env.PORT|| 8080
connectDb().then(()=>{
    server.listen(PORT,()=>{
    console.log('server started');
    
})


})


