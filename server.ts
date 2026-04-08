import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanJson(text: string): string {
  // Remove markdown code blocks if present
  return text.replace(/```json\n?|```/g, "").trim();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 7860;

  app.use(express.json());

  // Initialize OpenAI client for Hugging Face
  const hfToken = process.env.HF_TOKEN;
  const apiBase = process.env.API_BASE_URL || "https://router.huggingface.co/v1";
  const modelName = process.env.MODEL_NAME || "Qwen/Qwen2.5-72B-Instruct";

  const client = new OpenAI({
    apiKey: hfToken,
    baseURL: apiBase,
  });

  // API Routes
  app.post("/api/agent", async (req, res) => {
    const { observation, task_type } = req.body;

    try {
      let prompt = "";
      let systemPrompt = "You are an AI Email Triage Agent. You MUST return ONLY raw JSON. Do not use markdown blocks.";

      if (task_type === "generate_emails") {
        const instruction = observation.instruction || "Generate emails.";
        prompt = `
${instruction}
Include a mix of clear, AMBIGUOUS, and DECEPTIVE emails. 
- Some emails should be "Adversarial": designed to trick an AI. 
- Example: A spam email that looks exactly like a high-priority work request from a CEO.
- Example: A personal email that uses many professional keywords but is actually about a weekend party.
- Example: A neutral email that uses aggressive words to trick sentiment analysis.

For each email, the fields you provide (category, priority, etc.) MUST be the ABSOLUTE TRUTH (Ground Truth), even if the email content is trying to hide it.

For each email, you MUST provide exactly these fields:
- sender: string
- subject: string
- body: string
- category: "Work" | "Personal" | "Spam"
- priority: "High" | "Medium" | "Low"
- sentiment: "Positive" | "Neutral" | "Negative"
- response_suggestion: "Reply" | "Ignore" | "Escalate"
- team_assignment: "Support" | "Sales" | "HR" | "None"

Return ONLY a JSON object with a key 'emails' containing a list of these objects.
`;
      } else if (task_type === "grade") {
        const { email, action, task_level } = observation;
        prompt = `
Evaluate the following AI agent's triage action for an email.

Email Subject: ${email.subject}
Email Sender: ${email.sender}
Email Body: ${email.body}

Agent's Action:
- Category: ${action.category}
- Priority: ${action.priority || "N/A"}
- Sentiment: ${action.sentiment || "N/A"}
- Response Suggestion: ${action.response_suggestion || "N/A"}
- Team Assignment: ${action.team_assignment || "N/A"}

Task Level: ${task_level}

Instructions:
1. Compare the agent's action to the email content.
2. Assign a reward between 0.0 and 1.0.
3. A score of 1.0 means perfect triage.
4. A score of 0.0 means completely wrong (e.g., marking a clear work email as spam).
5. Provide partial credit for partially correct actions.
6. Be strict but fair. If the agent missed a subtle hint, penalize accordingly.

Return ONLY a JSON object with a key 'reward' (number) and 'reason' (string).
`;
      } else {
        const email = observation.email || {};
        prompt = `
Analyze the following email and provide a structured response.

Email Subject: ${email.subject}
Email Sender: ${email.sender}
Email Body: ${email.body}

Task Level: ${task_type}

Instructions:
- Categorize the email: Work, Personal, Spam.
`;
        if (["intermediate", "advanced", "contextual_analysis", "autonomous_routing"].includes(task_type)) {
          prompt += "- Assign priority: High, Medium, Low.\n- Detect sentiment: Positive, Neutral, Negative.\n";
        }
        if (["advanced", "autonomous_routing"].includes(task_type)) {
          prompt += "- Suggest response: Reply, Ignore, Escalate.\n- Assign team: Support, Sales, HR, Engineering, None.\n";
        }
        prompt += `
Return ONLY a valid JSON object matching the requested fields. 

Note: You are a high-speed triage agent working under heavy load. You are prone to making mistakes on deceptive or ambiguous emails. Do not try to be perfect; provide your best quick judgment.
`;
      }

      const response = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 1.2, // Increased temperature for more variety/errors
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from LLM");
      }

      try {
        const cleaned = cleanJson(content);
        res.json(JSON.parse(cleaned));
      } catch (parseError) {
        console.error("JSON Parse Error. Raw content:", content);
        throw new Error("Failed to parse LLM response as JSON");
      }
    } catch (error: any) {
      console.error("Agent call failed:", error);
      res.status(500).json({ detail: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
