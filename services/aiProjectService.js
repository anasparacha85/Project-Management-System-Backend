// services/aiProjectService.js
const schema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        projectName: { type: "string" },
        projectDescription: { type: "string" },
        budget: { type: "number" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string" },
              startDate: { type: "string" },
              dueDate: { type: "string" },
              estimatedHours: { type: "number" },
              subtasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string" },
                    estimatedHours: { type: "number" },
                    dueDate: { type: "string" }
                  },
                  required: ["title", "description", "priority", "estimatedHours", "dueDate"]
                }
              }
            },
            required: ["title", "description", "priority", "startDate", "dueDate", "estimatedHours", "subtasks"]
          }
        }
      },
      required: ["projectName", "projectDescription", "budget", "tasks"]
    },
    errors: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["success", "data", "errors"]
};

async function callHfAi(prompt, maxTokens = 10000, temperature = 0.7) {
  const apiUrl = process.env.HF_AI_URL || "https://muhammed-hasaan-careerflix.hf.space/get-ai-response";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  console.log(`HF AI API response status ${response} ${response.status}`);
  if (!response.ok) {
    
    
    const body = await response.text();
    throw new Error(`HF AI API error: ${response.status} ${response.statusText} - ${body}`);
  }

  const json = await response.json();
  console.log("HF AI API raw response:", json);

  if (!json) {
    throw new Error("HF AI API returned empty response");
  }

  const output =
    typeof json === "string"
      ? json
      : json.generated_text || json.text || json.output || json.data || json.response || JSON.stringify(json);

  if (!output) {
    throw new Error("Unable to parse HF AI response text");
  }

  return output;
}

/**
 * Sanitize and parse JSON response from AI
 * Handles common issues like unescaped quotes in descriptions
 */
function sanitizeAndParseJSON(jsonText) {
  // Remove markdown code blocks if present
  if (jsonText.includes("```json")) {
    jsonText = jsonText.split("```json")[1].split("```")[0];
  } else if (jsonText.includes("```")) {
    jsonText = jsonText.split("```")[1].split("```")[0];
  }

  jsonText = jsonText.trim();

  // Try direct parse first
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.warn("Direct JSON parse failed, attempting sanitization...", e.message);
  }

  // Handle case where quotes inside strings are already escaped
  // but might have extra backslashes from improper handling
  try {
    let sanitized = jsonText;
    
    // If we have \\" (escaped backslash + quote), it's likely double-escaped
    // Check if this is the issue and unescape it
    const doubleEscapedPattern = /\\\\"/g;
    if (doubleEscapedPattern.test(sanitized)) {
      console.log("Found double-escaped quotes, attempting to fix...");
      // Only unescape if we have too many backslashes
      sanitized = sanitized.replace(/\\\\"/g, '"');
      return JSON.parse(sanitized);
    }
  } catch (e) {
    console.warn("Double-escape fix failed:", e.message);
  }

  // Handle escaped quotes that need proper escaping
  try {
    let sanitized = jsonText;
    
    // Replace smart quotes with regular quotes
    sanitized = sanitized
      .replace(/[\u201C\u201D]/g, '"')  // Smart quotes " "
      .replace(/[\u2018\u2019]/g, "'")  // Smart apostrophes ' '
      .replace(/\r\n/g, ' ')             // Remove carriage returns
      .replace(/\n/g, ' ');              // Remove newlines
    
    return JSON.parse(sanitized);
  } catch (e) {
    console.warn("Smart quote replacement failed:", e.message);
  }

  // Most aggressive: Try to extract just the data we need
  try {
    // Try to extract the largest balanced JSON object (handles truncation)
    const extractBalancedJSON = (text) => {
      const start = text.indexOf("{");
      if (start === -1) return null;
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (!inString) {
          if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) {
              return text.substring(start, i + 1);
            }
          }
        }
      }
      return null;
    };

    const balanced = extractBalancedJSON(jsonText);
    if (balanced) {
      // Log snippet for debugging
      console.log("Extracted balanced JSON length:", balanced.length);
      // Try direct parse first
      try {
        return JSON.parse(balanced);
      } catch (e) {
        console.warn("Parsing extracted balanced JSON failed:", e.message);
        // try cleaning smart quotes inside extracted piece
        const cleaned = balanced.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\r?\n/g, ' ');
        return JSON.parse(cleaned);
      }
    }
  } catch (e) {
    console.warn("JSON extraction failed:", e.message);
  }

  // If all else fails, throw with helpful debugging info
  throw new Error(
    `JSON parsing failed after all sanitization attempts.\n` +
    `Error: Unable to parse AI response.\n` +
    `Response preview: ${jsonText.substring(0, 300)}\n` +
    `Please check if the AI service is returning properly formatted JSON.`
  );
}

/**
 * Generate project breakdown from user description
 * Input: "Create website redesign project"
 * Output: { name, description, tasks: [{...}, ...], timeline, budget }
 */
async function generateProjectBreakdown(userDescription, projectStartDate, projectEndDate) {
  const prompt = `You are an expert project manager. Generate a detailed project plan.


USER REQUEST: ${userDescription}

INTERPRETATION RULES (VERY IMPORTANT):
- If the user's request contains the word "milestone" or "milestones":
    → Treat each milestone as a MAIN TASK.
- If the user's request contains the word "checkpoint" or "checkpoints":
    → Treat each checkpoint as a SUBTASK under the related milestone/task.
- If the user mentions milestones but does NOT mention checkpoints:
    → Generate subtasks normally (2–3) but still treat milestones as tasks.
- If the user mentions checkpoints without milestones:
    → Convert the checkpoints into subtasks and generate logical main tasks.
- Always ensure tasks correspond to milestones and subtasks correspond to checkpoints when mentioned.
CRITICAL: Return ONLY valid JSON with no additional text, markdown, or code blocks.
PROJECT TIMELINE: Start ${projectStartDate} to ${projectEndDate}

CRITICAL: You MUST return ONLY valid JSON with no additional text, markdown, or code blocks.

JSON Schema (return EXACTLY this structure):
{
  "success": true,
  "data": {
    "projectName": "Project Name",
    "projectDescription": "Brief description here",
    "budget": 5000,
    "tasks": [
      {
        "title": "Task title",
        "description": "Task description - keep simple and clear",
        "priority": "Low",
        "startDate": "YYYY-MM-DD",
        "dueDate": "YYYY-MM-DD",
        "estimatedHours": 40,
        "subtasks": [
          {
            "title": "Subtask title",
            "description": "Subtask description",
            "priority": "Low",
            "estimatedHours": 10,
            "dueDate": "YYYY-MM-DD"
          }
        ]
      }
    ]
  },
  "errors": []
}

REQUIREMENTS:
- Generate 3-7 main tasks only
- Each task has 2-4 subtasks
- All dates within project timeline
- Simple descriptions without special characters
- Use simple language in descriptions
- Realistic effort estimates
- IMPORTANT: Ensure all JSON is valid and properly formatted`;

  try {
    const responseText = await callHfAi(prompt, 10000, 0.7);
    console.log("HF AI response preview:", responseText.substring(0, 500));
    const result = sanitizeAndParseJSON(responseText);
    return result;
  } catch (error) {
    console.error("AI generation error in generateProjectBreakdown:", error.message);
    return {
      success: false,
      data: null,
      errors: [error.message],
    };
  }
}

/**
 * Generate tasks for an existing project
 */
async function generateTasksForProject(projectId, projectName, projectDescription, userDescription, numberOfTasks = 5, projectStartDate, projectEndDate) {
  const prompt = `You are a project management expert. Generate ${numberOfTasks} tasks for a project.

PROJECT: ${projectName}
Description: ${projectDescription}
Timeline: ${projectStartDate} to ${projectEndDate}

USER REQUEST: ${userDescription}
INTERPRETATION RULES (VERY IMPORTANT):
- If the user's request contains the word "milestone" or "milestones":
    → Treat each milestone as a MAIN TASK.
- If the user's request contains the word "checkpoint" or "checkpoints":
    → Treat each checkpoint as a SUBTASK under the related milestone/task.
- If the user mentions milestones but does NOT mention checkpoints:
    → Generate subtasks normally (2–3) but still treat milestones as tasks.
- If the user mentions checkpoints without milestones:
    → Convert the checkpoints into subtasks and generate logical main tasks.
- Always ensure tasks correspond to milestones and subtasks correspond to checkpoints when mentioned.
CRITICAL: Return ONLY valid JSON with no additional text, markdown, or code blocks.

JSON Schema (return EXACTLY this structure):
{
  "success": true,
  "data": {
    "tasks": [
      {
        "title": "Task title",
        "description": "Task description - keep simple",
        "priority": "Low",
        "startDate": "YYYY-MM-DD",
        "dueDate": "YYYY-MM-DD",
        "estimatedHours": 40,
        "subtasks": [
          {
            "title": "Subtask title",
            "description": "Subtask description",
            "priority": "Low",
            "estimatedHours": 10,
            "dueDate": "YYYY-MM-DD"
          }
        ]
      }
    ]
  },
  "errors": []
}

REQUIREMENTS:
- Generate exactly ${numberOfTasks} tasks
- Each task has 2-3 subtasks if number of subtasks not provider by user
- Effort between 4-80 hours per task
- All dates within project timeline
- Simple descriptions without special characters
- Use simple language in descriptions
- Realistic dates and effort estimates
- IMPORTANT: Ensure all JSON is valid and properly formatted`;

  try {
    const responseText = await callHfAi(prompt, 10000, 0.7);
    console.log("HF AI task generation preview:", responseText.substring(0, 500));
    const result = sanitizeAndParseJSON(responseText);
    return result;
  } catch (error) {
    console.error("AI task generation error in generateTasksForProject:", error.message);
    return {
      success: false,
      data: null,
      errors: [error.message],
    };
  }
}

/**
 * Validate AI-generated data against project constraints
 */
function validateGeneratedData(data, project) {
  const errors = [];
  const projectStart = new Date(project.startDate);
  const projectEnd = new Date(project.endDate);

  if (!data.tasks || !Array.isArray(data.tasks)) {
    errors.push("Invalid tasks structure");
    return { valid: false, errors };
  }

  data.tasks.forEach((task, idx) => {
    // Validate dates
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);

    if (taskStart < projectStart) {
      errors.push(`Task ${idx + 1}: Start date before project start`);
    }
    // if (taskEnd > projectEnd) {
    //   errors.push(`Task ${idx + 1}: Due date after project end`);
    // }
    if (taskEnd < taskStart) {
      errors.push(`Task ${idx + 1}: Due date before start date`);
    }

    // Validate estimates (realistic bounds: 1-160 hours per task)
    if (task.estimatedHours < 1 || task.estimatedHours > 160) {
      errors.push(`Task ${idx + 1}: Unrealistic estimate (${task.estimatedHours}h)`);
    }

    // Validate priority
    if (!["Low", "Medium", "High"].includes(task.priority)) {
      errors.push(`Task ${idx + 1}: Invalid priority`);
    }

    // Validate subtasks
    if (task.subtasks && Array.isArray(task.subtasks)) {
      task.subtasks.forEach((st, sidx) => {
        if (st.estimatedHours > task.estimatedHours) {
          errors.push(
            `Task ${idx + 1}, SubTask ${sidx + 1}: Subtask hours (${st.estimatedHours}h) exceed parent task (${task.estimatedHours}h)`
          );
        }
        if (!["Low", "Medium", "High"].includes(st.priority)) {
          errors.push(`Task ${idx + 1}, SubTask ${sidx + 1}: Invalid priority`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate project creation data
 */
function validateProjectData(data) {
  const errors = [];

  if (!data.projectName || data.projectName.trim() === "") {
    errors.push("Project name is required");
  }

  if (!data.projectDescription || data.projectDescription.trim() === "") {
    errors.push("Project description is required");
  }

  if (!data.budget || data.budget <= 0) {
    errors.push("Budget must be a positive number");
  }

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    errors.push("At least one task is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  generateProjectBreakdown,
  generateTasksForProject,
  validateGeneratedData,
  validateProjectData,
};
