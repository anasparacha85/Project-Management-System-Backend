const mongoose=require('mongoose')

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  budget: { type: Number },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  
  // Project Creator (Admin/Manager)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Assigned Members
  team: [

    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      role: { type: String, enum: ["manager", "employee"] }
    }
  ],
  teamName: { type: String}, 

  // Files/Documents
  files: [
    {
      filename: String,
      url: String,  // S3/Cloudinary/local path
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  projectStatus:{
    type:String,
    enum:['draft','active','on Hold','Completed','archieve'],
    default:'draft'
  },
  Tasks:[{type:mongoose.Schema.Types.ObjectId ,ref:'Task'}],

  // For Dashboard Progress
  progress: { type: Number, default: 0 }, // % complete

}, { timestamps: true });

const Project=new mongoose.model("Project", projectSchema);
module.exports=Project
