---
title: Email Triage AI
emoji: 📧
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# Email Triage AI - OpenEnv Environment

## Overview
**Email Triage AI** is a fully autonomous, real-world simulation of an automated email management system. Unlike static environments, this one uses **AI-powered dynamic grading** to evaluate agent performance across multiple dimensions.

This environment is built to the **OpenEnv** specification, providing a standard `step()` / `reset()` / `state()` API for reinforcement learning and agentic evaluation.

## Key Features
- **Dynamic AI Grader**: Rewards are calculated by an LLM based on the agent's action context, providing nuanced partial progress signals (0.0 to 1.0).
- **Dynamic Email Generation**: Emails are generated on-the-fly using an LLM, ensuring the environment is never the same twice.
- **OpenEnv Compliant**: Full support for typed Pydantic models and the standard API.
- **Multi-Level Tasks**: Three distinct tasks ranging from basic categorization to full autonomous routing.

## Observation Space
The `EmailTriageObservation` model includes:
- `email_id`: Unique identifier for the email.
- `sender`: Email address of the sender.
- `subject`: The subject line of the email.
- `body`: The full text content of the email.
- `step`: Current step in the episode.
- `total_steps`: Total emails to process.
- `previous_reward`: The reward received for the last action.

## Action Space
The `EmailTriageAction` model includes:
- `category`: [Work, Personal, Spam]
- `priority`: [High, Medium, Low]
- `sentiment`: [Positive, Neutral, Negative]
- `response_suggestion`: [Reply, Ignore, Escalate]
- `team_assignment`: [Support, Sales, HR, Engineering, None]

## Reward Allocation Logic
The environment uses an **AI-powered dynamic grading system**. Instead of simple string matching, a frontier LLM acts as a "Grader" to evaluate the agent's actions contextually.

- **Contextual Evaluation**: The Grader reads the full email content and determines if the agent's classification, priority, and routing decisions make sense for that specific message.
- **Nuanced Scoring**: Rewards are assigned on a scale of `0.0` to `1.0`.
  - `1.0`: Perfect triage.
  - `0.0`: Completely incorrect (e.g., marking a critical work email as spam).
  - **Partial Credit**: The Grader can assign intermediate scores (e.g., `0.75`) if the agent was mostly correct but missed a subtle detail (like an urgent deadline or a specific sentiment).
- **Reasoning**: For every action, the Grader provides a natural language explanation for the assigned reward, which is displayed in the environment logs.

### Scoring Definitions
- **Reward**: The score for a **single email** processed in the current step. It reflects the agent's performance on that specific context.
- **Final Average Score**: The **cumulative average** of all rewards received during a complete simulation run. It represents the agent's overall reliability across multiple diverse emails.

This system ensures that agents are evaluated on their actual understanding of the email, rather than just matching a pre-defined label.

## Setup & Usage
### Local Installation
```bash
pip install -r requirements.txt
```

### Running the Baseline
```bash
export API_BASE_URL="https://router.huggingface.co/v1"
export MODEL_NAME="Qwen/Qwen2.5-72B-Instruct"
export HF_TOKEN="hf_..."
export MAX_STEPS=1
python inference.py
```

### Docker Build
```bash
docker build -t email-triage-ai .
docker run -p 7860:7860 email-triage-ai
```

## Deployment to Hugging Face Spaces (Docker)

To deploy the full-stack application to Hugging Face:

1. **Create a New Space**:
   - Go to [Hugging Face Spaces](https://huggingface.co/new-space).
   - Select **Docker** as the SDK.
   - Choose **Blank** as the template.

2. **Upload Files**:
   - Upload all files from this project (including `Dockerfile`, `package.json`, `server.ts`, and the `src/` folder).

3. **Configure Secrets**:
   - In your Space settings, add the following **Secrets**:
     - `GEMINI_API_KEY`: Your Google Gemini API key.
     - `MODEL_NAME`: (Optional) The model to use (defaults to `gemini-2.0-flash`).
     - `API_BASE_URL`: (Optional) If using a custom inference endpoint.

4. **Build & Run**:
   - Hugging Face will automatically build the Docker image using the provided `Dockerfile`.
   - The app will listen on port `7860` and serve the React frontend automatically.
