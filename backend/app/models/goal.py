from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class Goal(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    target_amount: float
    current_amount: float = Field(default=0.0)
    target_date: str # ISO string (e.g. 2031-12)
    category: str = Field(default="general") # retirement, house, education, vehicle, general
    created_at: datetime = Field(default_factory=datetime.utcnow)
