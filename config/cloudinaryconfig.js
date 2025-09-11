// utils/upload.js
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let resourceType = "auto"; 
    let format = null;

    if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else {
      resourceType = "raw"; // pdf, docx, rvt etc.
    }

    // ✅ Format detect karke lagao
    if (file.mimetype === "application/pdf") format = "pdf";
    if (file.mimetype === "application/msword") format = "doc";
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") format = "docx";

    return {
      folder: "test-files",
      resource_type: resourceType,
      format, // 👈 ye add karo
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 800 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowed = ["video/", "image/", "application/pdf", 
                     "application/msword", 
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "application/octet-stream"]; // RVT etc.

    if (allowed.some(type => file.mimetype.startsWith(type) || file.mimetype === type)) {
      cb(null, true);
    } else {
      cb(new Error("Only video, image, pdf, doc, docx, rvt files allowed"), false);
    }
  },
});

module.exports = upload;
