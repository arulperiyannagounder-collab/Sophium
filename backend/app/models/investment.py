from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class Investment(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    amount: float
    category: str = Field(default="Mutual Funds") # Mutual Funds, Stocks, FD, Gold, Crypto, Bonds, PPF, EPF
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
