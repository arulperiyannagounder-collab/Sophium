from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    profile_picture: Optional[str] = None
    monthly_income: float = Field(default=0.0)
    currency: str = Field(default="INR")
    country: Optional[str] = None
    timezone: Optional[str] = None
    risk_profile: str = Field(default="Moderate") # Low, Moderate, High, Critical
    investment_experience: Optional[str] = None # Beginner, Intermediate, Advanced
    financial_stage: Optional[str] = None

