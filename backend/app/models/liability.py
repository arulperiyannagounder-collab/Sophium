from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class Liability(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    amount: float
    category: str = Field(default="Credit Card") # Home Loan, Car Loan, Personal Loan, Education Loan, Credit Card
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
