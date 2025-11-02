// **FIXED generativeaiconfig.js**
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = genAI; // <-- **Export the instance directly**