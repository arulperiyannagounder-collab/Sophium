import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.core.database import get_session
from app.services.qdrant_service import qdrant_service
from app.core.response import make_response, StandardResponse

logger = logging.getLogger("api.goals")
router = APIRouter(prefix="/goals", tags=["goals"])

# --- Schemas ---

class GoalCreate(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0.0
    deadline: str # YYYY-MM
    category: str = "general"
    priority: str = "Medium" # Low, Medium, High, Critical
    description: Optional[str] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None # Active, Completed, Archived
    description: Optional[str] = None

# --- Helpers ---

def calculate_goal_metrics(goal: Goal):
    """Goal Progress Engine: calculates progress, remaining amount, and monthly required saving."""
    if goal.target_amount <= 0:
        goal.progress_percentage = 0.0
    else:
        goal.progress_percentage = round((goal.current_amount / goal.target_amount) * 100, 2)
        goal.progress_percentage = min(100.0, max(0.0, goal.progress_percentage))
        
    remaining = max(0.0, goal.target_amount - goal.current_amount)
    
    # Calculate months left until deadline YYYY-MM
    now = datetime.utcnow()
    try:
        if "-" in goal.deadline:
            parts = goal.deadline.split("-")
            year = int(parts[0])
            month = int(parts[1])
        else:
            year = now.year + 5
            month = now.month
            
        months_left = (year - now.year) * 12 + (month - now.month)
    except Exception:
        months_left = 12
        
    months_left = max(1, months_left)
    goal.monthly_required_saving = round(remaining / months_left, 2)

def is_deadline_in_past(deadline_str: str) -> bool:
    """Helper to check if a deadline month is in the past."""
    now = datetime.utcnow()
    try:
        if "-" in deadline_str:
            parts = deadline_str.split("-")
            year = int(parts[0])
            month = int(parts[1])
            if year < now.year:
                return True
            elif year == now.year and month < now.month:
                return True
        return False
    except Exception:
        return False

def sync_goal_memory(goal: Goal):
    """Automatically logs/updates goal state in Qdrant memory."""
    content = (
        f"User financial goal milestone: Name/Title: {goal.title}. Category: {goal.category}. "
        f"Target savings corpus: {goal.target_amount}. Current saved amount: {goal.current_amount}. "
        f"Goal deadline: {goal.deadline}. Priority level: {goal.priority}. Current status: {goal.status}. "
        f"Calculated monthly required savings rate: {goal.monthly_required_saving}. "
        f"Milestone completion progress: {goal.progress_percentage}%."
    )
    qdrant_service.store_memory(
        user_id=goal.user_id,
        memory_type="goal",
        category=goal.category,
        content=content,
        importance=4,
        metadata={"goal_id": goal.id}
    )

def delete_goal_memory(goal_id: str, user_id: str):
    """Deletes the Qdrant memory vectors related to this goal to keep consistency."""
    qdrant_service.delete_memories_by_filter(
        user_id=user_id,
        memory_type="goal",
        metadata_filter={"goal_id": goal_id}
    )

# --- Routes ---

@router.get("/summary", response_model=StandardResponse)
def get_goals_summary(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Goal Timeline and statistics dashboard API compiling completed, upcoming, and delayed goals."""
    try:
        statement = select(Goal).where(Goal.user_id == current_user.id)
        goals = session.exec(statement).all()
        
        upcoming = []
        completed = []
        delayed = []
        
        total_target = 0.0
        total_saved = 0.0
        
        priority_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
        
        for goal in goals:
            calculate_goal_metrics(goal)
            
            total_target += goal.target_amount
            total_saved += goal.current_amount
            priority_counts[goal.priority] = priority_counts.get(goal.priority, 0) + 1
            
            goal_data = {
                "id": goal.id,
                "title": goal.title,
                "name": goal.name,
                "target_amount": goal.target_amount,
                "current_amount": goal.current_amount,
                "deadline": goal.deadline,
                "target_date": goal.target_date,
                "category": goal.category,
                "priority": goal.priority,
                "status": goal.status,
                "progress_percentage": goal.progress_percentage,
                "monthly_required_saving": goal.monthly_required_saving,
                "description": goal.description
            }
            
            if goal.status == "Completed" or goal.progress_percentage >= 100.0:
                completed.append(goal_data)
            elif is_deadline_in_past(goal.deadline):
                delayed.append(goal_data)
            else:
                upcoming.append(goal_data)
                
        summary_payload = {
            "statistics": {
                "total_goals": len(goals),
                "total_target_amount": total_target,
                "total_saved_amount": total_saved,
                "overall_progress_percentage": round((total_saved / total_target * 100) if total_target > 0 else 0.0, 2),
                "average_goal_progress": round(sum(g.progress_percentage for g in goals) / len(goals) if goals else 0.0, 2),
                "priority_distribution": priority_counts
            },
            "timeline": {
                "upcoming_goals": upcoming,
                "completed_goals": completed,
                "delayed_goals": delayed
            }
        }
        
        return make_response(
            success=True,
            message="Goal summary and timelines compiled successfully",
            data=summary_payload
        )
    except Exception as e:
        logger.error(f"Error compiling goal summary: {e}")
        raise HTTPException(status_code=500, detail=f"Summary failed: {str(e)}")

@router.get("/statistics", response_model=StandardResponse)
def get_goals_statistics(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Simple shortcut endpoint for goal statistics."""
    return get_goals_summary(current_user, session)

@router.get("", response_model=StandardResponse)
def get_goals(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """List all goals with calculated progress metrics."""
    try:
        statement = select(Goal).where(Goal.user_id == current_user.id)
        results = session.exec(statement).all()
        
        output = []
        for goal in results:
            calculate_goal_metrics(goal)
            output.append(goal)
            
        return make_response(
            success=True,
            message="Goals retrieved successfully",
            data=output
        )
    except Exception as e:
        logger.error(f"Error listing goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=StandardResponse)
def create_goal(
    body: GoalCreate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """Creates a new financial target milestone, performs progress math, and updates Qdrant."""
    try:
        # Map fields
        goal = Goal(
            user_id=current_user.id,
            title=body.title,
            name=body.title,
            target_amount=body.target_amount,
            current_amount=body.current_amount,
            deadline=body.deadline,
            target_date=body.deadline,
            category=body.category,
            priority=body.priority,
            description=body.description,
            status="Active"
        )
        
        calculate_goal_metrics(goal)
        session.add(goal)
        session.commit()
        session.refresh(goal)
        
        # Sync to memory
        sync_goal_memory(goal)
        
        return make_response(
            success=True,
            message="Goal created successfully",
            data=goal
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating goal: {e}")
        raise HTTPException(status_code=500, detail=f"Creation failed: {str(e)}")

@router.put("/{goal_id}", response_model=StandardResponse)
def update_goal(
    goal_id: str,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Updates saving balance or target attributes, recalculates timeline progress, and updates vector memory."""
    try:
        goal = session.get(Goal, goal_id)
        if not goal or goal.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Goal not found")
            
        if body.title is not None:
            goal.title = body.title
            goal.name = body.title
        if body.target_amount is not None:
            goal.target_amount = body.target_amount
        if body.current_amount is not None:
            goal.current_amount = body.current_amount
        if body.deadline is not None:
            goal.deadline = body.deadline
            goal.target_date = body.deadline
        if body.category is not None:
            goal.category = body.category
        if body.priority is not None:
            goal.priority = body.priority
        if body.status is not None:
            goal.status = body.status
        if body.description is not None:
            goal.description = body.description
            
        goal.updated_at = datetime.utcnow()
        calculate_goal_metrics(goal)
        
        session.add(goal)
        session.commit()
        session.refresh(goal)
        
        # Sync update to memory
        sync_goal_memory(goal)
        
        return make_response(
            success=True,
            message="Goal updated successfully",
            data=goal
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating goal {goal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{goal_id}/archive", response_model=StandardResponse)
def archive_goal(
    goal_id: str, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """Archives an active target goal, marking it as Archived."""
    try:
        goal = session.get(Goal, goal_id)
        if not goal or goal.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Goal not found")
            
        goal.status = "Archived"
        goal.updated_at = datetime.utcnow()
        
        session.add(goal)
        session.commit()
        session.refresh(goal)
        
        # Sync update to memory
        sync_goal_memory(goal)
        
        return make_response(
            success=True,
            message="Goal archived successfully",
            data=goal
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Error archiving goal {goal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{goal_id}", response_model=StandardResponse)
def delete_goal(
    goal_id: str, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """Deletes a financial target milestone and removes it from Qdrant vector memory."""
    try:
        goal = session.get(Goal, goal_id)
        if not goal or goal.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Goal not found")
            
        session.delete(goal)
        session.commit()
        
        # Delete related memory from Qdrant to maintain consistency
        delete_goal_memory(goal_id, current_user.id)
        
        return make_response(
            success=True,
            message="Goal deleted from database and vector memory successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting goal {goal_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
