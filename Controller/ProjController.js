const updateProjectProgress = require("../helper/projrectprogresshelper");
const Project = require("../Modal/ProjectModal");
const Task = require("../Modal/TaskModal");
const mongoose = require("mongoose");


const fetchProjectReportById = async (req, res) => {
    try {
        const projectId = new mongoose.Types.ObjectId(req.params.id);

        const report = await Project.aggregate([
            { $match: { _id: projectId } },

            // Lookup tasks
            {
                $lookup: {
                    from: "tasks",
                    localField: "Tasks",
                    foreignField: "_id",
                    as: "taskDetails",
                },
            },

            // Lookup team users
            {
                $lookup: {
                    from: "users",
                    localField: "team.user",
                    foreignField: "_id",
                    as: "teamMembers",
                },
            },

            // Lookup files uploaders
            {
                $lookup: {
                    from: "users",
                    localField: "files.uploadedBy",
                    foreignField: "_id",
                    as: "fileUploaders",
                },
            },

            {
                $addFields: {
                    numberOfTeamMembers: { $size: "$teamMembers" },
                    numberOfTasks: { $size: "$taskDetails" },
                    numberOfFiles: { $size: "$files" },

                    // Count assignees across all tasks
                    allAssignees: {
                        $reduce: {
                            input: "$taskDetails.assignees.user",
                            initialValue: [],
                            in: { $concatArrays: ["$$value", "$$this"] },
                        },
                    },
                },
            },

            // Unique assignee count
            {
                $addFields: {
                    numberOfUniqueAssignees: {
                        $size: { $setUnion: ["$allAssignees", []] },
                    },
                },
            },

            // Task breakdown with readable labels
            {
                $addFields: {
                    taskStatusBreakdown: [
                        {
                            status: "Todo",
                            count: {
                                $size: {
                                    $filter: { input: "$taskDetails", cond: { $eq: ["$$this.status", "todo"] } },
                                },
                            },
                        },
                        {
                            status: "In Progress",
                            count: {
                                $size: {
                                    $filter: { input: "$taskDetails", cond: { $eq: ["$$this.status", "in-progress"] } },
                                },
                            },
                        },
                        {
                            status: "Review",
                            count: {
                                $size: {
                                    $filter: { input: "$taskDetails", cond: { $eq: ["$$this.status", "review"] } },
                                },
                            },
                        },
                        {
                            status: "Completed",
                            count: {
                                $size: {
                                    $filter: { input: "$taskDetails", cond: { $eq: ["$$this.status", "completed"] } },
                                },
                            },
                        },
                    ],
                },
            },

            // Average progress
            {
                $addFields: {
                    averageProgress: {
                        $cond: [
                            { $gt: [{ $size: "$taskDetails" }, 0] },
                            { $avg: "$taskDetails.progress" },
                            0,
                        ],
                    },
                },
            },

          // Calculate total weeks safely
{
    $addFields: {
        totalWeeks: {
            $ifNull: [
                {
                    $floor: {
                        $divide: [
                            { $subtract: ["$endDate", "$startDate"] },
                            1000 * 60 * 60 * 24 * 7
                        ]
                    }
                },
                0
            ]
        }
    }
},

// Planned progress (linear progression)
{
    $addFields: {
        plannedProgress: {
            $map: {
                input: { $range: [0, { $add: [{ $ifNull: ["$totalWeeks", 0] }, 1] }] },
                as: "week",
                in: {
                    week: { $concat: ["Week ", { $toString: { $add: ["$$week", 1] } }] },
                    planned: {
                        $min: [
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $add: ["$$week", 1] },
                                                    { $max: ["$totalWeeks", 1] }
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        }
    }
},

// Actual progress (weekly grouping)
{
    $addFields: {
        actualProgress: {
            $map: {
                input: { $range: [0, { $add: [{ $ifNull: ["$totalWeeks", 0] }, 1] }] },
                as: "week",
                in: {
                    week: { $concat: ["Week ", { $toString: { $add: ["$$week", 1] } }] },
                    actual: {
                        $ifNull: [
                            {
                                $round: [
                                    {
                                        $avg: {
                                            $map: {
                                                input: {
                                                    $filter: {
                                                        input: "$taskDetails",
                                                        cond: {
                                                            $lte: [
                                                                "$$this.updatedAt",
                                                                {
                                                                    $add: [
                                                                        "$startDate",
                                                                        { $multiply: ["$$week", 1000 * 60 * 60 * 24 * 7] }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }
                                                },
                                                as: "t",
                                                in: "$$t.progress"
                                            }
                                        }
                                    },
                                    2
                                ]
                            },
                            0
                        ]
                    }
                }
            }
        }
    }
},

// Merge planned and actual progress
{
  $addFields: {
    progressHistory: {
      $map: {
        input: { $range: [0, { $size: "$plannedProgress" }] },
        as: "index",
        in: {
          week: { $arrayElemAt: ["$plannedProgress.week", "$$index"] },
          planned: { $arrayElemAt: ["$plannedProgress.planned", "$$index"] },
          actual: { $arrayElemAt: ["$actualProgress.actual", "$$index"] }
        }
      }
    }
  }
},
        // Final projection
            {
                $project: {
                    name: 1,
                    description: 1,
                    startDate: 1,
                    endDate: 1,
                    priority: 1,
                    projectStatus: 1,
                    numberOfTeamMembers: 1,
                    numberOfTasks: 1,
                    numberOfFiles: 1,
                    numberOfUniqueAssignees: 1,
                    taskStatusBreakdown: 1,
                    averageProgress: 1,
                    progressHistory: 1,
                    budget: 1,
                },
            },
        ]);

        res.status(200).json(report[0] || {});
    } catch (error) {
        console.error(error);
        res.status(500).json({
            FailureMessage: "Error generating project report",
            error: error.message,
        });
    }
};


const fetchProjectDetailsById = async (req, res) => {
  try {
    const projectId = req.params.id;

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ FailureMessage: "Invalid project ID" });
    }

    // ✅ Query with populate
    const project = await Project.findOne({ _id: projectId })
      .populate("createdBy", "name email status avatarUrl") // sirf required fields lao
      .populate("files.uploadedBy", "name email status avatarUrl")
      .populate("team.user", "name email role status avatarUrl" )
      .populate("Tasks"); // tasks ka pura data lao

    if (!project) {
      return res.status(404).json({ FailureMessage: "No project details found" });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error("Fetch Project Error:", error.message);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

const fetchFilesByProjectId=async(req,res)=>{
    try {
        const projectId=req.params.id
        const project=await Project.findOne({_id:projectId},{files:1,name:1,description:1}).populate({path:'files.uploadedBy'})
        if(!project){
            return res.status(403).json({FailureMessage:"no project found"})
        }
        res.status(200).json(project)

    } catch (error) {
        res.status(500).json({FailureMessage:"Internal Server error"})
        
    }
}


const fetchMilestonesByProjectId=async(req,res)=>{
    try {
        const projectId=req.params.id;
        const milestones=await Task.find({project:projectId}).populate({path:'attachments.uploadedBy assignees.user dependencies'})
        if(!milestones){
            return res.status(400).json({FailureMessage:'no milestones found'})
        }
        res.status(200).json(milestones)

    } catch (error) {
        console.log(error);
        
        res.status(500).json({FailureMessage:"internal server error"})
        
    }
}



const updateProjectDetailsById = async (req, res) => {
  try {
    const managerId = req.user._id;
    const { name, description, budget, startDate, endDate, projectStatus, priority, projectId } = req.body;
    console.log(projectId,"===========",name);
    

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ FailureMessage: "Invalid project ID" });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (budget) updateFields.budget = budget;
    if (startDate) updateFields.startDate = startDate;
    if (endDate) updateFields.endDate = endDate;
    if (projectStatus) updateFields.projectStatus = projectStatus;
    if (priority) updateFields.priority = priority;

    const project = await Project.findOneAndUpdate(
      { _id: projectId, createdBy: managerId },
      { $set: updateFields },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ FailureMessage: "No project found" });
    }
await updateProjectProgress(project._id)
    res.status(200).json({
      SuccessMessage: "Project details updated successfully",
      project,
    });

  } catch (error) {
    console.error("Update Project Error:", error.message, error.stack);
    res.status(500).json({ FailureMessage: "Internal server error" });
  }
};

const deleteProjectById=async(req,res)=>{
    try {
        const projectId=req.params.id;
        const managerId=req.params.id
         const project=await  Project.findOne({_id:projectId,createdBy:managerId});
           if(!project){
            return res.status(400).json({FailureMessage:"no project found"})
        }
        const deletedproject=await Project.deleteOne({_id:project._id,createdBy:project.createdBy})
       return res.status(200).json({SuccessMessage:'Project Deleted Successfully'})

    } catch (error) {
      return  res.status(500).json({FailureMessage:"Internal Server error"})
        
    }
}
// Upload files by projectId
const uploadfilesByProjectId = async (req, res) => {
  try {
    const { id: projectId } = req.params;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ FailureMessage: "Invalid project ID" });
    }

    // Validate uploaded files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ FailureMessage: "No files uploaded" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ FailureMessage: "Project not found" });
    }

    // Map uploaded files into a clean structure
    const uploadedFiles = req.files.map((file) => ({
      filename: file.originalname || file.filename,
      url: file.path, // Cloudinary gives `path` as secure_url
      size: file.size || 0,
      uploadedAt: new Date(),
    }));

    // Push all new files in one go
    project.files.push(...uploadedFiles);
    await project.save();

    return res.status(200).json({
      SuccessMessage: "Files uploaded successfully",
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      FailureMessage: "Internal Server Error",
      details: error.message,
    });
  }
};



module.exports = { fetchProjectReportById,fetchFilesByProjectId,fetchProjectDetailsById ,updateProjectDetailsById,deleteProjectById,fetchMilestonesByProjectId,updateProjectDetailsById,uploadfilesByProjectId};
