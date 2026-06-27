from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from app.api.auth import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.core.database import get_session

router = APIRouter(prefix="/goals", tags=["goals"])

@router.get("", response_model=List[Goal])
def get_goals(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(Goal).where(Goal.user_id == current_user.id)
    return session.exec(statement).all()

@router.post("", response_model=Goal)
def create_goal(goal: Goal, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    goal.user_id = current_user.id
    goal.created_at = datetime.utcnow()
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal

@router.put("/{goal_id}", response_model=Goal)
def update_goal(goal_id: str, updated_goal: Goal, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Updates savings progress or details of an active goal milestone."""
    db_goal = session.get(Goal, goal_id)
    if not db_goal or db_goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_goal.name = updated_goal.name
    db_goal.target_amount = updated_goal.target_amount
    db_goal.current_amount = updated_goal.current_amount
    db_goal.target_date = updated_goal.target_date
    db_goal.category = updated_goal.category
    
    session.add(db_goal)
    session.commit()
    session.refresh(db_goal)
    return db_goal

@router.delete("/{goal_id}")
def delete_goal(goal_id: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Deletes a financial target milestone from user profile."""
    db_goal = session.get(Goal, goal_id)
    if not db_goal or db_goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    session.delete(db_goal)
    session.commit()
    return {"status": "success", "message": "Goal deleted successfully."}

