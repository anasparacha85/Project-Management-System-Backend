const genAI = require("../config/generativeaiconfig");



const GenerateDescription = async (req, res) => {
  try {
    const { name, type, parent } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Name is required for description generation" });
    }

    let prompt = "";
if (type === "project") {
  prompt = `Give me a detailed summary for project "${name}" which i want to create`;
} else if (type === "milestone") {
  prompt = `Give me a Detailed summary for the milestone "${name}" of the project "${parent}" in a friendly and professional way.`;
} else if (type === "checkpoint") {
  prompt = `Give me a Detailed summary for the for the checkpoint "${name}" under the milestone "${parent}". Keep it human and direct.`;
} else {
  prompt = `Write a short, clear, and natural description for "${name}".`;
}

    const response = await genAI.getGenerativeModel({ model: "gemini-2.5-flash" }).generateContent(prompt);
    console.log(response);
    
    // ✅ Extract text safely
    const descriptionText = response?.response?.text() || "No description generated.";

    res.json({ description: descriptionText });

  } catch (err) {
    console.error("AI description generation failed:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

module.exports = { GenerateDescription };
