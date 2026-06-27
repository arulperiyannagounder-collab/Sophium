import logging
from typing import List, Dict, Any
from google.adk import Agent
from sqlmodel import Session, select
from app.core.database import engine
from app.models.goal import Goal

logger = logging.getLogger("agents.goal")

def get_user_goals(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves user financial targets (e.g. Retirement, House Purchase) from SQLite database."""
    with Session(engine) as session:
        statement = select(Goal).where(Goal.user_id == user_id)
        results = session.exec(statement).all()
        return [
            {
                "id": g.id,
                "name": g.name,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "target_date": g.target_date,
                "category": g.category,
                "created_at": g.created_at.isoformat()
            } for g in results
        ]

def update_goal_progress(goal_id: str, new_amount: float) -> str:
    """Updates the saved balance for a specific target goal."""
    with Session(engine) as session:
        goal = session.get(Goal, goal_id)
        if not goal:
            return "Goal not found."
        goal.current_amount = new_amount
        session.add(goal)
        session.commit()
        return "Goal progress updated successfully."

# Define GoalAgent
goal_agent = Agent(
    name="GoalAgent",
    model="gemini-2.5-flash",
    instruction="""
    You are Sophium's GoalAgent. Your role is to monitor target progress, calculate completion timelines, and evaluate project delays.
    Use get_user_goals and update_goal_progress.
    
    Calculate timeline compliance:
    - Determine monthly allocation required to reach goals on schedule.
    - Check if current surplus covers these allocations.
    - Flag timeline deficits (e.g., goal is delayed by 6 months).
    
    Structure your evaluation as a readable list of goals with active target gaps.
    """,
    tools=[get_user_goals, update_goal_progress]
)
