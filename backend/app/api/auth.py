import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, field_validator

from app.core.database import get_session, init_db, engine
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.models.user import User
from app.models.preference import Preference
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.income import Income
from app.models.investment import Investment
from app.models.asset import Asset
from app.models.liability import Liability
from app.services.qdrant_service import qdrant_service
from app.services.scheduler_service import proactive_notifications
from app.core.response import make_response, StandardResponse

logger = logging.getLogger("api.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- Schemas ---

class UserSignup(BaseModel):
    email: str
    password: str
    full_name: str
    monthly_income: float = 0.0
    currency: str = "INR"
    country: Optional[str] = None
    timezone: Optional[str] = None
    risk_profile: str = "Moderate"
    investment_experience: Optional[str] = None
    financial_stage: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address format")
        return v.strip().lower()

class UserLoginSchema(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email address format")
        return v.strip().lower()

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    monthly_income: Optional[float] = None
    currency: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    risk_profile: Optional[str] = None
    investment_experience: Optional[str] = None
    financial_stage: Optional[str] = None

class PreferenceUpdate(BaseModel):
    theme: Optional[str] = None
    notifications: Optional[bool] = None
    language: Optional[str] = None
    default_currency: Optional[str] = None
    preferred_dashboard: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# --- Helper functions ---

def sync_financial_profile_memory(user: User):
    """Automatically records or updates user financial profile in Qdrant."""
    content = (
        f"User financial profile summary: Name: {user.full_name or 'N/A'}. "
        f"Monthly income: {user.monthly_income} {user.currency}. "
        f"Location: {user.country or 'N/A'} (Timezone: {user.timezone or 'N/A'}). "
        f"Risk tolerance level: {user.risk_profile}. "
        f"Investment experience: {user.investment_experience or 'N/A'}. "
        f"Life/Financial stage: {user.financial_stage or 'N/A'}."
    )
    qdrant_service.store_memory(
        user_id=user.id,
        memory_type="financial_profile",
        category="profile",
        content=content,
        importance=5
    )

def sync_preference_memory(pref: Preference):
    """Automatically records or updates user preferences in Qdrant."""
    content = (
        f"User UI preference settings: Selected theme: {pref.theme}. "
        f"Default transaction currency: {pref.default_currency}. "
        f"Preferred Dashboard View: {pref.preferred_dashboard}. "
        f"Language setting: {pref.language}. "
        f"System notifications enabled: {pref.notifications}."
    )
    qdrant_service.store_memory(
        user_id=pref.user_id,
        memory_type="preference",
        category="preference",
        content=content,
        importance=3
    )

def warm_memory_cache(user_id: str, session: Session) -> Dict[str, Any]:
    """Warms the user's vector memory and loads their active profile/goals cache.
    
    Loads: Memory, Goal Memory, User Profile, Financial Profile.
    """
    user = session.get(User, user_id)
    if not user:
        return {}
    
    # Query goals
    goals = session.exec(select(Goal).where(Goal.user_id == user_id)).all()
    # Query preferences
    pref = session.exec(select(Preference).where(Preference.user_id == user_id)).first()
    
    # Query recent memories from Qdrant to ensure cache/connection is warm
    memories = qdrant_service.search_similar_memory(
        user_id=user_id,
        query="financial goals budget profile preferences",
        limit=10
    )
    
    logger.info(f"Warmed memory cache for user {user_id}. Loaded {len(goals)} goals and {len(memories)} memories.")
    return {
        "user_id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "monthly_income": user.monthly_income,
        "currency": user.currency,
        "risk_profile": user.risk_profile,
        "preferences": {
            "theme": pref.theme if pref else "dark",
            "language": pref.language if pref else "en",
            "default_currency": pref.default_currency if pref else "INR",
            "notifications": pref.notifications if pref else True,
            "preferred_dashboard": pref.preferred_dashboard if pref else "default"
        },
        "goal_count": len(goals),
        "memory_count": len(memories)
    }

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return user

# --- Routes ---

@router.post("/signup", response_model=StandardResponse)
def signup(body: UserSignup, session: Session = Depends(get_session)):
    """Registers a new user and configures default preference parameters."""
    # Check if user already exists
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email address is already registered"
        )
        
    try:
        hashed = get_password_hash(body.password)
        user = User(
            email=body.email,
            password_hash=hashed,
            full_name=body.full_name,
            monthly_income=body.monthly_income,
            currency=body.currency,
            country=body.country,
            timezone=body.timezone,
            risk_profile=body.risk_profile,
            investment_experience=body.investment_experience,
            financial_stage=body.financial_stage
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Create default preferences
        pref = Preference(
            user_id=user.id,
            theme="dark",
            notifications=True,
            language="en",
            default_currency=body.currency,
            preferred_dashboard="default"
        )
        session.add(pref)
        session.commit()
        session.refresh(pref)

        # Sync profile and preference to vector memory
        sync_financial_profile_memory(user)
        sync_preference_memory(pref)

        # Generate token
        token = create_access_token(user.id)
        
        data = {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "monthly_income": user.monthly_income,
                "currency": user.currency,
                "risk_profile": user.risk_profile
            },
            "preferences": {
                "theme": pref.theme,
                "default_currency": pref.default_currency,
                "language": pref.language,
                "notifications": pref.notifications
            }
        }
        
        return make_response(
            success=True,
            message="User signed up and configured successfully",
            data=data
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error during signup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=StandardResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """Authenticates credentials, updates login metadata, and warms vector cache."""
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email credentials or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Update last login timestamp
        user.last_login = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

        # Warm Memory Cache
        warmed = warm_memory_cache(user.id, session)

        token = create_access_token(user.id)
        
        # Get preferences
        pref = session.exec(select(Preference).where(Preference.user_id == user.id)).first()
        
        data = {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "monthly_income": user.monthly_income,
                "currency": user.currency,
                "risk_profile": user.risk_profile,
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "preferences": {
                "theme": pref.theme if pref else "dark",
                "default_currency": pref.default_currency if pref else "INR",
                "language": pref.language if pref else "en",
                "notifications": pref.notifications if pref else True,
                "preferred_dashboard": pref.preferred_dashboard if pref else "default"
            },
            "cache": warmed
        }
        
        return make_response(
            success=True,
            message="Login successful and memory cache warmed",
            data=data
        )
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login processing failed: {str(e)}"
        )

@router.post("/validate", response_model=StandardResponse)
def validate_session(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Validates session token validity, returning user profile and preferences."""
    pref = session.exec(select(Preference).where(Preference.user_id == current_user.id)).first()
    warmed = warm_memory_cache(current_user.id, session)
    
    data = {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "monthly_income": current_user.monthly_income,
            "currency": current_user.currency,
            "risk_profile": current_user.risk_profile,
            "country": current_user.country,
            "timezone": current_user.timezone,
            "investment_experience": current_user.investment_experience,
            "financial_stage": current_user.financial_stage,
            "profile_picture": current_user.profile_picture
        },
        "preferences": {
            "theme": pref.theme if pref else "dark",
            "default_currency": pref.default_currency if pref else "INR",
            "language": pref.language if pref else "en",
            "notifications": pref.notifications if pref else True,
            "preferred_dashboard": pref.preferred_dashboard if pref else "default"
        },
        "cache": warmed
    }
    
    return make_response(
        success=True,
        message="Session is valid",
        data=data
    )

@router.get("/profile", response_model=StandardResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Fetches details of the currently authenticated user."""
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "monthly_income": current_user.monthly_income,
        "currency": current_user.currency,
        "country": current_user.country,
        "timezone": current_user.timezone,
        "risk_profile": current_user.risk_profile,
        "investment_experience": current_user.investment_experience,
        "financial_stage": current_user.financial_stage,
        "profile_picture": current_user.profile_picture,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }
    return make_response(success=True, message="Profile fetched successfully", data=user_dict)

@router.put("/profile", response_model=StandardResponse)
def update_profile(
    body: ProfileUpdate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """Updates user information and synchronization with Qdrant profile memory."""
    try:
        if body.full_name is not None:
            current_user.full_name = body.full_name
        if body.profile_picture is not None:
            current_user.profile_picture = body.profile_picture
        if body.monthly_income is not None:
            current_user.monthly_income = body.monthly_income
        if body.currency is not None:
            current_user.currency = body.currency
        if body.country is not None:
            current_user.country = body.country
        if body.timezone is not None:
            current_user.timezone = body.timezone
        if body.risk_profile is not None:
            current_user.risk_profile = body.risk_profile
        if body.investment_experience is not None:
            current_user.investment_experience = body.investment_experience
        if body.financial_stage is not None:
            current_user.financial_stage = body.financial_stage
            
        current_user.updated_at = datetime.utcnow()
        session.add(current_user)
        session.commit()
        session.refresh(current_user)

        # Sync update to Qdrant memory
        sync_financial_profile_memory(current_user)

        user_dict = {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "monthly_income": current_user.monthly_income,
            "currency": current_user.currency,
            "country": current_user.country,
            "timezone": current_user.timezone,
            "risk_profile": current_user.risk_profile,
            "investment_experience": current_user.investment_experience,
            "financial_stage": current_user.financial_stage,
            "profile_picture": current_user.profile_picture,
            "updated_at": current_user.updated_at.isoformat()
        }

        return make_response(
            success=True,
            message="User profile updated successfully",
            data=user_dict
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

@router.get("/profile/preferences", response_model=StandardResponse)
def get_preferences(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Fetches user preferences."""
    pref = session.exec(select(Preference).where(Preference.user_id == current_user.id)).first()
    if not pref:
        pref = Preference(user_id=current_user.id)
        session.add(pref)
        session.commit()
        session.refresh(pref)
        
    pref_dict = {
        "id": pref.id,
        "theme": pref.theme,
        "notifications": pref.notifications,
        "language": pref.language,
        "default_currency": pref.default_currency,
        "preferred_dashboard": pref.preferred_dashboard
    }
    return make_response(success=True, message="Preferences retrieved successfully", data=pref_dict)

@router.put("/profile/preferences", response_model=StandardResponse)
def update_preferences(
    body: PreferenceUpdate, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """Updates user configuration settings and saves preference state to vector memory."""
    try:
        pref = session.exec(select(Preference).where(Preference.user_id == current_user.id)).first()
        if not pref:
            pref = Preference(user_id=current_user.id)
            
        if body.theme is not None:
            pref.theme = body.theme
        if body.notifications is not None:
            pref.notifications = body.notifications
        if body.language is not None:
            pref.language = body.language
        if body.default_currency is not None:
            pref.default_currency = body.default_currency
        if body.preferred_dashboard is not None:
            pref.preferred_dashboard = body.preferred_dashboard
            
        session.add(pref)
        session.commit()
        session.refresh(pref)

        # Sync update to Qdrant memory
        sync_preference_memory(pref)

        pref_dict = {
            "id": pref.id,
            "theme": pref.theme,
            "notifications": pref.notifications,
            "language": pref.language,
            "default_currency": pref.default_currency,
            "preferred_dashboard": pref.preferred_dashboard
        }

        return make_response(
            success=True,
            message="User preferences updated successfully",
            data=pref_dict
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error updating preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Preferences update failed: {str(e)}")

@router.put("/profile/password", response_model=StandardResponse)
def change_password(
    body: PasswordChange, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """Secures change of current password with verification checks."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Current password verification failed"
        )
        
    try:
        current_user.password_hash = get_password_hash(body.new_password)
        current_user.updated_at = datetime.utcnow()
        session.add(current_user)
        session.commit()
        return make_response(success=True, message="Password changed successfully")
    except Exception as e:
        session.rollback()
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail=f"Password change failed: {str(e)}")

@router.post("/seed", response_model=StandardResponse)
def seed_demo_mode(session: Session = Depends(get_session)):
    """Reinitializes the database and seeds the standard hackathon demo environment."""
    try:
        # Clear existing tables (SQLite)
        from sqlmodel import SQLModel
        SQLModel.metadata.drop_all(engine)
        init_db()
        
        # Create Rohan User
        hashed = get_password_hash("password")
        rohan = User(
            id="rohan-demo-uuid-12345",
            email="rohan@sophium.com",
            password_hash=hashed,
            full_name="Rohan Sharma",
            monthly_income=120000.0,
            currency="INR",
            country="India",
            timezone="IST",
            risk_profile="Moderate",
            investment_experience="Intermediate",
            financial_stage="Wealth Builder",
            last_login=datetime.utcnow()
        )
        session.add(rohan)
        session.commit()
        session.refresh(rohan)
        
        # Create Preferences for Rohan
        pref = Preference(
            user_id=rohan.id,
            theme="dark",
            notifications=True,
            language="en",
            default_currency="INR",
            preferred_dashboard="default"
        )
        session.add(pref)
        session.commit()
        
        # Create Goals
        goal1 = Goal(
            id="goal-flat-123",
            user_id=rohan.id,
            name="Buy 2BHK Flat",
            target_amount=2500000.0,
            current_amount=500000.0,
            target_date="2031-12",
            category="house",
            description="Purchase a home in Pune",
            priority="High",
            status="Active"
        )
        goal2 = Goal(
            id="goal-retire-456",
            user_id=rohan.id,
            name="Retire at 55",
            target_amount=15000000.0,
            current_amount=1000000.0,
            target_date="2053-06",
            category="retirement",
            description="Achieve financial independence",
            priority="Critical",
            status="Active"
        )
        session.add(goal1)
        session.add(goal2)
        
        # Create Mock Incomes
        incomes = [
            Income(user_id=rohan.id, amount=120000.0, category="salary", description="Tech Company Monthly Salary", date=datetime.utcnow()),
            Income(user_id=rohan.id, amount=15000.0, category="freelance", description="FastAPI Consulting Work", date=datetime.utcnow() - timedelta(days=5))
        ]
        for inc in incomes:
            session.add(inc)

        # Create Mock Transactions (Expenses)
        transactions = [
            Transaction(user_id=rohan.id, amount=30000.0, category="Rent", type="expense", description="2BHK Rent payment", is_recurring=True, payment_method="Net Banking", tags="rent,living"),
            Transaction(user_id=rohan.id, amount=12000.0, category="Food", type="expense", description="Weekly grocery and dining out", payment_method="UPI", tags="food,dining"),
            Transaction(user_id=rohan.id, amount=10000.0, category="Shopping", type="expense", description="Summer apparel shopping", payment_method="Credit Card", tags="shopping,discretionary"),
            Transaction(user_id=rohan.id, amount=8000.0, category="Utilities", type="expense", description="Electricity & Internet bill", is_recurring=True, payment_method="Net Banking", tags="bills"),
            Transaction(user_id=rohan.id, amount=5000.0, category="Travel", type="expense", description="Cab fares and fuel expenses", payment_method="UPI", tags="travel"),
            Transaction(user_id=rohan.id, amount=15000.0, category="Investment", type="expense", description="Monthly Nifty 50 Index SIP", is_recurring=True, payment_method="UPI", tags="savings,sip")
        ]
        for t in transactions:
            session.add(t)

        # Create Mock Investments
        investments = [
            Investment(user_id=rohan.id, name="HDFC Index Fund Nifty 50", amount=450000.0, category="Mutual Funds", description="Equity mutual fund holding", date=datetime.utcnow()),
            Investment(user_id=rohan.id, name="PPF Account", amount=500000.0, category="PPF", description="Government tax saver deposit", date=datetime.utcnow()),
            Investment(user_id=rohan.id, name="Physical Sovereign Gold Bonds", amount=50000.0, category="Gold", description="RBI SGB Tranche VII", date=datetime.utcnow())
        ]
        for inv in investments:
            session.add(inv)

        # Create Mock Assets
        assets = [
            Asset(user_id=rohan.id, name="HDFC Bank Balance", value=350000.0, category="Bank", description="Savings Account liquid cash"),
            Asset(user_id=rohan.id, name="Emergency Cash Pool", value=150000.0, category="Cash", description="Physical emergency cash at home"),
            Asset(user_id=rohan.id, name="Gold Jewellery", value=100000.0, category="Gold", description="Family ancestral gold")
        ]
        for asset in assets:
            session.add(asset)

        # Create Mock Liabilities
        liabilities = [
            Liability(user_id=rohan.id, name="SBI Education Loan", amount=450000.0, category="Education Loan", description="Pending university fee loan"),
            Liability(user_id=rohan.id, name="ICICI Rubyx Credit Card", amount=45000.0, category="Credit Card", description="Current month bill balance")
        ]
        for liab in liabilities:
            session.add(liab)
            
        session.commit()
        
        # Seed Qdrant Memory Collections
        qdrant_service.delete_memories_by_filter(user_id=rohan.id) # Clear old records
        
        sync_financial_profile_memory(rohan)
        sync_preference_memory(pref)

        qdrant_service.store_memory(
            user_id=rohan.id,
            memory_type="semantic",
            category="financial_preference",
            content="Rohan prefers index funds (Nifty 50, Nifty Next 50) and exhibits moderate risk tolerance.",
            importance=4
        )
        qdrant_service.store_memory(
            user_id=rohan.id,
            memory_type="goal",
            category="house",
            content="Rohan aims to purchase a 2BHK flat in Pune by December 2031 (Target: ₹25 Lakhs, current savings: ₹5 Lakhs).",
            importance=5
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
        
        # Warm memory cache
        warmed = warm_memory_cache(rohan.id, session)

        token = create_access_token(rohan.id)
        
        data = {
            "status": "success",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": rohan.id,
                "email": rohan.email,
                "full_name": rohan.full_name,
                "monthly_income": rohan.monthly_income,
                "currency": rohan.currency,
                "risk_profile": rohan.risk_profile
            },
            "cache": warmed
        }
        
        return make_response(
            success=True,
            message="Database successfully seeded and initialized for Rohan",
            data=data
        )
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding demo database: {e}")
        raise HTTPException(status_code=500, detail=f"Database seeding failed: {str(e)}")

@router.post("/demo-login", response_model=StandardResponse)
def demo_login(session: Session = Depends(get_session)):
    """Fast-tracks authentication by directly logging into the standard Rohan demo account."""
    user = session.exec(select(User).where(User.email == "rohan@sophium.com")).first()
    if not user:
        return seed_demo_mode(session)
        
    try:
        user.last_login = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

        warmed = warm_memory_cache(user.id, session)
        token = create_access_token(user.id)
        pref = session.exec(select(Preference).where(Preference.user_id == user.id)).first()
        
        data = {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "monthly_income": user.monthly_income,
                "currency": user.currency,
                "risk_profile": user.risk_profile,
                "last_login": user.last_login.isoformat()
            },
            "preferences": {
                "theme": pref.theme if pref else "dark",
                "default_currency": pref.default_currency if pref else "INR",
                "language": pref.language if pref else "en",
                "notifications": pref.notifications if pref else True,
                "preferred_dashboard": pref.preferred_dashboard if pref else "default"
            },
            "cache": warmed
        }
        
        return make_response(
            success=True,
            message="Demo login successful",
            data=data
        )
    except Exception as e:
        logger.error(f"Error during demo login: {e}")
        raise HTTPException(status_code=500, detail=f"Demo authentication failed: {str(e)}")

@router.post("/demo/seed", response_model=StandardResponse)
def demo_seed(session: Session = Depends(get_session)):
    """Triggers the mock database and vector memory seeder."""
    return seed_demo_mode(session)

@router.post("/demo/reset", response_model=StandardResponse)
def demo_reset(session: Session = Depends(get_session)):
    """Wipes the database and resets user tables."""
    try:
        from sqlmodel import SQLModel
        SQLModel.metadata.drop_all(engine)
        init_db()
        return make_response(success=True, message="Database successfully reset to empty state")
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
