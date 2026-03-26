const  mongoose  = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date ,default:null},
  endDate: { type: Date,default:null },
  budget: { type: Number },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
   
  },

  team: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
     
      },
      role: {
        type: String,
        enum: ["manager", "employee"],
        index: true
      }
    }
  ],

  teamName: { type: String, index: true },

  files: [
    {
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
       
      }
    }
  ],

  projectStatus: {
    type:String,
    enum:['draft','active','on Hold','Completed','archieve'],
    default:'draft',
  
  },

  Tasks:[{ type: mongoose.Schema.Types.ObjectId , ref:'Task' }],

  progress: { type: Number, default: 0 },

}, { timestamps: true });


// ------------------------------------
// ✅ Add compound indexes (VERY IMPORTANT)
// ------------------------------------

// 1) User ke sab projects fast find
projectSchema.index({ createdBy: 1, projectStatus: 1 });
projectSchema.index({"files.uploadedBy":1}) // for files uploaded by specific user

// 2) Team members ke projects fast find
projectSchema.index({ "team.user": 1 });

// 3) Search by project name (case-insensitive)
projectSchema.index({ name: "text" });

// 4) Tasks query optimization
projectSchema.index({ Tasks: 1 });

// ------------------------------------

const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
