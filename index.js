const express=require('express')
const cors=require('cors')
const connectDb = require('./config/db')
const cookieParser=require('cookie-parser')
const UserRouter = require('./Route/UserRoute')
const ManagerRouter = require('./Route/ManagerRoute')
const taskRouter = require('./Route/TaskRoute')
const ProjectRouter = require('./Route/ProjectRoute')
const SubTaskRouter = require('./Route/SubTaskRoute')
const EmployeeRouter = require('./Route/EmployeeRoute')
const AiRouter=require('./Route/AiRoute')
const CommentsRouter = require('./Route/CommentsRoute')
const { initSocket } = require('./socket/socket')
const http = require('http');
const NotificationRouter = require('./Route/NotificationRoute')


require('dotenv').config()

// create express app
const app = express()

// create http server from express app
const server = http.createServer(app)

// initialize socket.io with the HTTP server (initSocket should return io)
const io = initSocket(server)

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.get("/", (req, res) => {
    res.status(200).json({ SuccessMessage: "server started" })

})
console.log(process.env.CLOUDINARY_API_KEY, process.env.CLOUDINARY_API_SECRET, process.env.CLOUDINARY_CLOUD_NAME);

app.use('/api/auth', UserRouter)
app.use('/api/manager', ManagerRouter)
app.use('/api/project', ProjectRouter)
app.use('/api/tasks', taskRouter)
app.use('/api/subTask', SubTaskRouter)
app.use('/api/employee', EmployeeRouter)
app.use('/api/ai', AiRouter)
app.use('/api/comments', CommentsRouter)
app.use('/api/notifications', NotificationRouter)

const PORT = process.env.PORT || 8080
connectDb().then(() => {
    server.listen(PORT, () => {
        console.log(`✅ Server started on port ${PORT}`)
    })
}).catch((err) => {
    console.error('❌ Database connection failed:', err)
})


