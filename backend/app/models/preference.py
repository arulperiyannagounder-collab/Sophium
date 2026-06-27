from typing import Optional
from sqlmodel import Field, SQLModel
import uuid

class Preference(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, unique=True)
    theme: str = Field(default="dark")
    notifications: bool = Field(default=True)
    language: str = Field(default="en")
    default_currency: str = Field(default="INR")
    preferred_dashboard: str = Field(default="default")
