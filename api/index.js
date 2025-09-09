const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDb = require("../config/db");

const UserRouter = require("../Route/UserRoute");
const ManagerRouter = require("../Route/ManagerRoute");
const taskRouter = require("../Route/TaskRoute");
const ProjectRouter = require("../Route/ProjectRoute");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Backend working on Vercel" });
});

app.use("/api/auth", UserRouter);
app.use("/api/manager", ManagerRouter);
app.use("/api/project", ProjectRouter);
app.use("/api/tasks", taskRouter);

connectDb();

module.exports = app;
module.exports.handler = serverless(app);
