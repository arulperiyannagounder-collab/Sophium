import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from app.core.database import get_session, init_db, engine
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.models.user import User
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.services.qdrant_service import qdrant_service
from app.services.scheduler_service import proactive_notifications

logger = logging.getLogger("api.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/signup")
def signup(
    email: str, 
    password: str, 
    full_name: str, 
    monthly_income: float = 0.0, 
    financial_risk_tolerance: str = "Moderate",
    session: Session = Depends(get_session)
):
    # Check if user already exists
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed = get_password_hash(password)
    user = User(
        email=email, 
        hashed_password=hashed, 
        full_name=full_name, 
        monthly_income=monthly_income,
        financial_risk_tolerance=financial_risk_tolerance
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Generate token
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/seed")
def seed_demo_mode(session: Session = Depends(get_session)):
    """Reinitializes the database and seeds the standard hackathon demo environment."""
    try:
        # Clear existing tables (SQLite)
        # Drop all, then create all
        from sqlmodel import SQLModel
        SQLModel.metadata.drop_all(engine)
        init_db()
        
        # Create Rohan User
        hashed = get_password_hash("password")
        rohan = User(
            id="rohan-demo-uuid-12345",
            email="rohan@sophium.com",
            hashed_password=hashed,
            full_name="Rohan Sharma",
            monthly_income=120000.0,
            financial_risk_tolerance="Moderate"
        )
        session.add(rohan)
        session.commit()
        
        # Create Goals
        goal1 = Goal(
            user_id=rohan.id,
            name="Buy 2BHK Flat",
            target_amount=2500000.0,
            current_amount=500000.0,
            target_date="2031-12",
            category="house"
        )
        goal2 = Goal(
            user_id=rohan.id,
            name="Retire at 55",
            target_amount=15000000.0,
            current_amount=1000000.0,
            target_date="2053-06",
            category="retirement"
        )
        session.add(goal1)
        session.add(goal2)
        
        # Create Mock Transactions
        transactions = [
            Transaction(user_id=rohan.id, amount=30000.0, category="rent", description="2BHK Rent payment", is_recurring=True),
            Transaction(user_id=rohan.id, amount=12000.0, category="food", description="Weekly grocery and dining out"),
            Transaction(user_id=rohan.id, amount=10000.0, category="shopping", description="Summer apparel shopping"),
            Transaction(user_id=rohan.id, amount=8000.0, category="utilities", description="Electricity, Internet & Mobile bill", is_recurring=True),
            Transaction(user_id=rohan.id, amount=5000.0, category="travel", description="Cab fares and fuel expenses"),
            Transaction(user_id=rohan.id, amount=15000.0, category="investment", description="Monthly Nifty 50 Index SIP", is_recurring=True)
        ]
        for t in transactions:
            session.add(t)
            
        session.commit()
        
        # Seed Qdrant Memory Collection
        qdrant_service.upsert_memory(
            user_id=rohan.id,
            mem_type="profile_fact",
            category="income",
            content="Rohan earns ₹1,20,000 monthly as a Senior Software Engineer."
        )
        qdrant_service.upsert_memory(
            user_id=rohan.id,
            mem_type="financial_preference",
            category="investment",
            content="Rohan prefers standard index fund mutual funds (Nifty 50, Nifty Next 50) and has moderate risk tolerance."
        )
        qdrant_service.upsert_memory(
            user_id=rohan.id,
            mem_type="goal_record",
            category="house",
            content="Rohan aims to purchase a 2BHK apartment in Pune by December 2031 (Target: ₹25L)."
        )
        
        # Seed Qdrant Knowledge Base (RAG)
        knowledge_facts = [
            "Indian equity index mutual funds historical yields show average return rate of 12.4% CAGR over 10 years.",
            "Under Section 80C of Income Tax Act, taxpayers can claim deductions up to ₹1.5 Lakhs annually on investments like ELSS, PPF, and NPS.",
            "Emergency liquidity guidelines recommend holding 6 months of fixed expenditures in highly liquid savings bank accounts or short term liquid debt funds.",
            "Long Term Capital Gains (LTCG) tax on equity is 12.5% for gains exceeding ₹1.25 Lakhs per year (as of updated Union Budget rules)."
        ]
        for fact in knowledge_facts:
            qdrant_service.upsert_knowledge(category="financial_rule", content=fact)
            
        # Reset proactive notifications queue
        proactive_notifications[rohan.id] = []
        
        token = create_access_token(rohan.id)
        return {
            "status": "success",
            "message": "Demo mode database seeded successfully.",
            "access_token": token,
            "user": {
                "id": rohan.id,
                "email": rohan.email,
                "full_name": rohan.full_name,
                "monthly_income": rohan.monthly_income,
                "financial_risk_tolerance": rohan.financial_risk_tolerance
            }
        }
    except Exception as e:
        logger.error(f"Error seeding demo database: {e}")
        raise HTTPException(status_code=500, detail=f"Database seeding failed: {e}")

@router.get("/profile", response_model=User)
def get_profile(current_user: User = Depends(get_current_user)):
    """Fetches details of the currently authenticated user."""
    return current_user

@router.post("/demo-login")
def demo_login(session: Session = Depends(get_session)):
    """Fast-tracks authentication by directly logging into the standard Rohan demo account."""
    user = session.exec(select(User).where(User.email == "rohan@sophium.com")).first()
    if not user:
        return seed_demo_mode(session)
    token = create_access_token(user.id)
    return {
        "status": "success",
        "message": "Demo login successful.",
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "monthly_income": user.monthly_income,
            "financial_risk_tolerance": user.financial_risk_tolerance
        }
    }

@router.post("/demo/seed")
def demo_seed(session: Session = Depends(get_session)):
    """Triggers the mock database and vector memory seeder."""
    return seed_demo_mode(session)

@router.post("/demo/reset")
def demo_reset(session: Session = Depends(get_session)):
    """Wipes the database and resets user tables."""
    try:
        from sqlmodel import SQLModel
        SQLModel.metadata.drop_all(engine)
        init_db()
        return {"status": "success", "message": "Database successfully reset to empty state."}
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=f"Reset failed: {e}")

