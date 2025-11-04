// const createProject=async(req,res)=>{
//     try {
//         const {}
//     } catch (error) {

const transporter  = require("../config/nodeMailerConfig");
const updateProjectProgress = require("../helper/projrectprogresshelper");
const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");
const { User } = require("../Modal/User");




        
//     }
// }

const fetchAllManagers=async(req,res)=>{
    try {
        console.log(req.user);
        console.log(req.cookies);
        
        
        const managers=await User.find({role:'manager'})
        if(managers.length==0 || !managers){
            return res.status(400).json({FailureMessage:"No Managers found"})
        }
        res.status(200).json(managers)
    } catch (error) {
        console.log(error);
        
        res.status(500).json({FailureMessage:"internal server error"})
        
    }
}
const fetchAllEmployees=async(req,res)=>{
    try {
        const employees=await User.find({role:'employee'})
        if(!employees || employees.length==0){
            return res.status(400).json({FailureMessage:"No employees found"})
        }
        res.status(200).json(employees)
    } catch (error) {
        console.log(error);
        
        res.status(500).json({FailureMessage:"Internal server erro"})
        
    }
}

const fetchEmployeesByQuery=async(req,res)=>{
    try {
        const search=req.query.search
        const employees=await User.find({
            role:'employee',
            $or:[
                {name:{$regex:search,$options:'i'}},
                {email:{$regex:search,$options:'i'}}
            ]
            
        })
        if(employees.length==0){
            return res.status(400).json({FailureMessage:"no employees found"})
        }
        res.status(200).json(employees)
    } catch (error) {
        console.log(error);
        res.status(500).json({FailureMessage:'internal server error'})
        
        
    }
}

// const Project = require("../models/project.model");
// const User = require("../models/user.model");

// // Utility: format uploaded files (multer or cloud response)
// function formatFiles(files, userId) {
//   if (!files || files.length === 0) return [];
//   return files.map((file) => ({
//     filename: file.originalname,
//     url: file.path || file.location, // path = local, location = s3
//     uploadedBy: userId,
//   }));
// }

// @desc    Create new project
// @route   POST /api/projects
// @access  Authenticated (Admin/Manager)
const createProject = async (req, res) => {
  try {
    let {
      name,
      description,
      startDate,
      endDate,
      budget,
      priority,
      teamName,
      // managerId,
      memberIds,
    } = req.body;
   
    // console.log(name,description);
    
    

    const userId = req.user._id;
    console.log(userId);
    

    if (!name || !startDate ) {
      return res.status(400).json({ FailureMessage: "Required fields missing" });
    }
    const managerRole=await User.findById(req.user._id)
    if(managerRole.role !=='manager'){
      return res.status(401).json({FailureMessage:"Your are not authorized for this role"})
    }
    // ✅ verify manager
    const manager = await User.findById(userId);
    if (!manager) {
      return res.status(404).json({ FailureMessage: "Manager not found" });
    }

    // ✅ verify team members
    const members = await User.find({ _id: { $in: memberIds || [] } });
    const team = [];

    // add manager as manager
    team.push({ user: manager._id, role: "manager" });

    // add members as employees
    members.forEach((m) => {
      if (m._id.toString() !== manager._id.toString()) {
        team.push({ user: m._id, role: "employee" });

      }
    });

    // ✅ handle files from multer-cloudinary
    const files = (req.files || []).map(file => ({
      url: file.path,           // Cloudinary URL
      filename: file.filename,  // Cloudinary public_id
      mimetype: file.mimetype,  // file type
      size: file.size           // optional: file size
    }));
    if (endDate === "null" || endDate === "" || endDate === undefined) {
  endDate = null;
}
    // ✅ create project
    const project = await Project.create({
      name,
      description,
      startDate,
       endDate, 
      budget,
      priority,
      createdBy: userId,
      team,
      files, 
      teamName  // save file info in DB
    });

    res.status(201).json({
      SuccessMessage: "Project created successfully",
      project,
    });
   
    
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ FailureMessage: "Server error", error: error.message });
  }
};


const fetchProjectByManagerId=async(req,res)=>{
    try {
      console.log(req.user._id);
      
        const projects=await Project.find({createdBy:req.user._id})
        if(!projects || projects.length==0){
            return res.status(404).json({FailureMessage:"No Projects are created"})
        }
        res.status(200).json(projects)
    } catch (error) {
          res.status(500).json({FailureMessage:"Internal Server error"})
        
    }
}
const InviteMembersByProjectId = async (req, res) => {
  try {
    const { members, projectId } = req.body;
    console.log(members,projectId);
    
    // Check current user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ FailureMessage: "User not found" });
    }
    if (user.role !== "manager") {
      return res.status(401).json({ FailureMessage: "You are not authorized for this role" });
    }

    // Check project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }

    for (const member of members) {
      // Skip if already in team
      const alreadyExists = project.team.some(
        (m) => m.user.toString() === member.user._id
      );
      if (!alreadyExists) {
        project.team.push({ user: member.user._id, role: member.user.role });
      }
    }

    await project.save();
    return res.status(200).json({ SuccessMessage: "Invitations sent successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ FailureMessage: "Internal server error" });
  }
};








module.exports={fetchAllEmployees,fetchAllManagers,fetchEmployeesByQuery,createProject,fetchProjectByManagerId,InviteMembersByProjectId}