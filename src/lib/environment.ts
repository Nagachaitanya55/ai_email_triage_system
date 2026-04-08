import { GoogleGenAI, Type } from "@google/genai";

// Configuration from environment variables (defined in vite.config.ts)
const API_BASE_URL = process.env.API_BASE_URL || "https://router.huggingface.co/v1";
const MODEL_NAME = process.env.MODEL_NAME || "Qwen/Qwen2.5-72B-Instruct";
const HF_TOKEN = process.env.HF_TOKEN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * Helper to call the backend agent proxy for LLM tasks
 */
async function callLLM(observation: any, taskType: string) {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        observation,
        task_type: taskType,
      }),
    });
    
    if (!response.ok) {
      let errorMessage = "Agent call failed";
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } else {
          const text = await response.text();
          errorMessage = `Server error (${response.status}): ${text.substring(0, 100)}`;
        }
      } catch (e) {
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Invalid response format (expected JSON): ${text.substring(0, 100)}`);
    }
  } catch (e) {
    console.error("Agent proxy call failed:", e);
    throw e;
  }
}

export enum EmailCategory {
  WORK = "Work",
  PERSONAL = "Personal",
  SPAM = "Spam",
}

export enum PriorityLevel {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export enum Sentiment {
  POSITIVE = "Positive",
  NEUTRAL = "Neutral",
  NEGATIVE = "Negative",
}

export enum ResponseSuggestion {
  REPLY = "Reply",
  IGNORE = "Ignore",
  ESCALATE = "Escalate",
}

export enum TeamAssignment {
  SUPPORT = "Support",
  SALES = "Sales",
  HR = "HR",
  NONE = "None",
}

export interface Email {
  id: string;
  subject: string;
  body: string;
  sender: string;
  groundTruth: {
    category: EmailCategory;
    priority: PriorityLevel;
    sentiment: Sentiment;
    responseSuggestion: ResponseSuggestion;
    teamAssignment: TeamAssignment;
  };
}

export interface TriageAction {
  category: EmailCategory;
  priority?: PriorityLevel;
  sentiment?: Sentiment;
  response_suggestion?: ResponseSuggestion;
  team_assignment?: TeamAssignment;
}

export const EMAILS: Email[] = [
  {
    id: "1",
    sender: "hr@company.com",
    subject: "New Policy Update",
    body: "Please review the attached document regarding the new remote work policy. All employees are required to sign by Friday.",
    groundTruth: {
      category: EmailCategory.WORK,
      priority: PriorityLevel.HIGH,
      sentiment: Sentiment.NEUTRAL,
      responseSuggestion: ResponseSuggestion.REPLY,
      teamAssignment: TeamAssignment.HR,
    },
  },
  {
    id: "2",
    sender: "marketing@spam.com",
    subject: "Win a Free iPhone!",
    body: "Congratulations! You've been selected to participate in our lucky draw. Click here to claim your prize now!",
    groundTruth: {
      category: EmailCategory.SPAM,
      priority: PriorityLevel.LOW,
      sentiment: Sentiment.POSITIVE,
      responseSuggestion: ResponseSuggestion.IGNORE,
      teamAssignment: TeamAssignment.NONE,
    },
  },
  {
    id: "3",
    sender: "mom@gmail.com",
    subject: "Sunday Dinner",
    body: "Hey honey, are you coming over for dinner this Sunday? I'm making your favorite lasagna.",
    groundTruth: {
      category: EmailCategory.PERSONAL,
      priority: PriorityLevel.MEDIUM,
      sentiment: Sentiment.POSITIVE,
      responseSuggestion: ResponseSuggestion.REPLY,
      teamAssignment: TeamAssignment.NONE,
    },
  },
  {
    id: "4",
    sender: "customer@client.com",
    subject: "URGENT: System Down",
    body: "Our production environment is completely unresponsive. We need immediate assistance to restore services.",
    groundTruth: {
      category: EmailCategory.WORK,
      priority: PriorityLevel.HIGH,
      sentiment: Sentiment.NEGATIVE,
      responseSuggestion: ResponseSuggestion.ESCALATE,
      teamAssignment: TeamAssignment.SUPPORT,
    },
  },
  {
    id: "5",
    sender: "sales@partner.com",
    subject: "Partnership Opportunity",
    body: "We've been following your company's growth and would love to discuss a potential collaboration that could benefit both parties.",
    groundTruth: {
      category: EmailCategory.WORK,
      priority: PriorityLevel.MEDIUM,
      sentiment: Sentiment.POSITIVE,
      responseSuggestion: ResponseSuggestion.REPLY,
      teamAssignment: TeamAssignment.SALES,
    },
  },
  {
    id: "6",
    sender: "newsletter@tech.com",
    subject: "Weekly Tech Digest",
    body: "Here are the top 10 tech stories from this week. From AI breakthroughs to new hardware releases.",
    groundTruth: {
      category: EmailCategory.PERSONAL,
      priority: PriorityLevel.LOW,
      sentiment: Sentiment.NEUTRAL,
      responseSuggestion: ResponseSuggestion.IGNORE,
      teamAssignment: TeamAssignment.NONE,
    },
  },
  {
    id: "7",
    sender: "angry.user@web.com",
    subject: "Terrible Service",
    body: "I've been waiting for a response for three days. Your support is non-existent and I'm canceling my subscription.",
    groundTruth: {
      category: EmailCategory.WORK,
      priority: PriorityLevel.HIGH,
      sentiment: Sentiment.NEGATIVE,
      responseSuggestion: ResponseSuggestion.REPLY,
      teamAssignment: TeamAssignment.SUPPORT,
    },
  },
  {
    id: "8",
    sender: "noreply@bank.com",
    subject: "Monthly Statement Available",
    body: "Your monthly bank statement for March 2024 is now available for viewing in your online portal.",
    groundTruth: {
      category: EmailCategory.PERSONAL,
      priority: PriorityLevel.LOW,
      sentiment: Sentiment.NEUTRAL,
      responseSuggestion: ResponseSuggestion.IGNORE,
      teamAssignment: TeamAssignment.NONE,
    },
  },
];

export class EmailTriageEnv {
  private currentStep: number = 0;
  public emails: Email[] = [];
  private taskType: "basic" | "intermediate" | "advanced";
  private previousReward: number = 0;
  private maxSteps: number;

  constructor(taskType: "basic" | "intermediate" | "advanced" = "basic", maxSteps: number = 1) {
    this.taskType = taskType;
    this.maxSteps = maxSteps;
  }

  public async inferGroundTruth(email: { sender: string; subject: string; body: string }) {
    const observation = { email };

    try {
      const data = await callLLM(observation, "advanced");

      return {
        category: data.category as EmailCategory,
        priority: data.priority as PriorityLevel,
        sentiment: data.sentiment as Sentiment,
        responseSuggestion: data.responseSuggestion as ResponseSuggestion,
        teamAssignment: data.teamAssignment as TeamAssignment,
      };
    } catch (error) {
      console.error("Ground truth inference failed:", error);
      return {
        category: EmailCategory.WORK,
        priority: PriorityLevel.MEDIUM,
        sentiment: Sentiment.NEUTRAL,
        responseSuggestion: ResponseSuggestion.REPLY,
        teamAssignment: TeamAssignment.NONE,
      };
    }
  }

  async reset() {
    this.currentStep = 0;
    this.previousReward = 0;
    
    // If emails weren't manually set (e.g. from custom input), generate them
    if (this.emails.length === 0) {
      await this.generateDynamicEmails();
    }
    
    return this.getObservation();
  }

  private async generateDynamicEmails() {
    const observation = { 
      system: true, 
      instruction: `Generate ${this.maxSteps} unique, diverse, and realistic emails for an email triage task.` 
    };

    try {
      const data = await callLLM(observation, "generate_emails");

      const generated = data.emails || [];
      
      this.emails = generated.map((e: any, i: number) => ({
        id: (i + 1).toString(),
        sender: e.sender,
        subject: e.subject,
        body: e.body,
        groundTruth: {
          category: (e.category || EmailCategory.WORK) as EmailCategory,
          priority: (e.priority || PriorityLevel.MEDIUM) as PriorityLevel,
          sentiment: (e.sentiment || Sentiment.NEUTRAL) as Sentiment,
          responseSuggestion: (e.responseSuggestion || e.response_suggestion || ResponseSuggestion.REPLY) as ResponseSuggestion,
          teamAssignment: (e.teamAssignment || e.team_assignment || TeamAssignment.NONE) as TeamAssignment,
        }
      }));
    } catch (error) {
      console.error("Dynamic email generation failed:", error);
      // Fallback to a random subset of static emails
      this.emails = [...EMAILS]
        .sort(() => 0.5 - Math.random())
        .slice(0, this.maxSteps);
    }
  }

  getObservation() {
    if (this.currentStep >= this.emails.length) {
      return null;
    }
    return {
      email: this.emails[this.currentStep],
      step: this.currentStep + 1,
      previousReward: this.previousReward,
      totalSteps: this.emails.length,
    };
  }

  async calculateReward(action: TriageAction): Promise<{ reward: number; reason: string }> {
    const email = this.emails[this.currentStep];
    const observation = { email, action, task_level: this.taskType };
    
    try {
      const data = await callLLM(observation, "grade");
      return {
        reward: data.reward ?? 0,
        reason: data.reason || "No reason provided."
      };
    } catch (error) {
      console.error("Grading failed, falling back to heuristic:", error);
      // Fallback to heuristic if AI grading fails
      const gt = email.groundTruth;
      let correctFields = 0;
      let totalFields = 0;
      const normalize = (val: string) => (val || "").toString().trim().toLowerCase();

      if (this.taskType === "basic" || this.taskType === "intermediate" || this.taskType === "advanced") {
        totalFields++;
        if (normalize(action.category) === normalize(gt.category)) correctFields++;
      }
      if (this.taskType === "intermediate" || this.taskType === "advanced") {
        totalFields += 2;
        if (normalize(action.priority) === normalize(gt.priority)) correctFields++;
        if (normalize(action.sentiment) === normalize(gt.sentiment)) correctFields++;
      }
      if (this.taskType === "advanced") {
        totalFields += 2;
        if (normalize(action.response_suggestion) === normalize(gt.responseSuggestion)) correctFields++;
        if (normalize(action.team_assignment) === normalize(gt.teamAssignment)) correctFields++;
      }
      return {
        reward: correctFields / totalFields,
        reason: "Heuristic evaluation (AI grader failed)."
      };
    }
  }

  async step(action: TriageAction) {
    const { reward, reason } = await this.calculateReward(action);
    this.previousReward = reward;
    this.currentStep++;
    const done = this.currentStep >= this.emails.length;
    return {
      reward,
      reason,
      observation: this.getObservation(),
      done,
    };
  }
}

export async function callAgent(observation: any, taskType: string): Promise<TriageAction> {
  try {
    // We pass the observation and taskType to the backend, which handles prompt construction
    const data = await callLLM(observation, taskType);
    
    return {
      category: data.category || EmailCategory.WORK,
      priority: data.priority || PriorityLevel.MEDIUM,
      sentiment: data.sentiment || Sentiment.NEUTRAL,
      response_suggestion: data.response_suggestion || data.responseSuggestion || ResponseSuggestion.REPLY,
      team_assignment: data.team_assignment || data.teamAssignment || TeamAssignment.NONE,
    };
  } catch (error) {
    console.error("Agent call failed:", error);
    // Fallback default action
    return {
      category: EmailCategory.WORK,
      priority: PriorityLevel.MEDIUM,
      sentiment: Sentiment.NEUTRAL,
      response_suggestion: ResponseSuggestion.REPLY,
      team_assignment: TeamAssignment.NONE,
    };
  }
}
