from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI()

# ---------- Dummy Models ----------
class ResetRequest(BaseModel):
    task_id: str = "basic"
    max_steps: int = 1

class Action(BaseModel):
    message: str


# ---------- ROUTES ----------
@app.get("/")
def home():
    return {"status": "running"}

@app.post("/reset")
def reset(req: ResetRequest):
    return {
        "observation": {
            "email": "test email"
        },
        "reward": 0.0,
        "done": False,
        "info": {}
    }

@app.post("/step")
def step(action: Action):
    return {
        "observation": {"email": "processed"},
        "reward": 1.0,
        "done": True,
        "info": {}
    }

@app.get("/state")
def state():
    return {"state": "ok"}
