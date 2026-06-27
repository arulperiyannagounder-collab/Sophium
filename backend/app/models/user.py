from typing import Optional
from sqlmodel import Field, SQLModel
import uuid

class User(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: Optional[str] = None
    monthly_income: float = Field(default=0.0)
    financial_risk_tolerance: str = Field(default="Moderate") # Low, Moderate, High
