from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class Transaction(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    amount: float
    category: str # rent, food, shopping, utilities, travel, investment, custom
    description: str
    date: datetime = Field(default_factory=datetime.utcnow)
    is_recurring: bool = Field(default=False)
