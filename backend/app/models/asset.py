from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class Asset(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    value: float
    category: str = Field(default="Cash") # House, Car, Cash, Bank, Land, Gold, Digital Assets
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
