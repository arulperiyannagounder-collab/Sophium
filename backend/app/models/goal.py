from typing import Optional
from sqlmodel import Field, SQLModel
import uuid
from datetime import datetime

class Goal(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    
    # Dual compatibility fields
    name: str # e.g. "Buy 2BHK Flat"
    title: str # e.g. "Buy 2BHK Flat"
    
    description: Optional[str] = None
    target_amount: float
    current_amount: float = Field(default=0.0)
    
    # Dual compatibility deadline dates
    target_date: str # ISO string e.g. "2031-12"
    deadline: str # ISO string e.g. "2031-12"
    
    category: str = Field(default="general") # Retirement, Emergency Fund, House, Car, Education, Travel, Marriage, Investment, Business, general
    priority: str = Field(default="Medium") # Low, Medium, High, Critical
    status: str = Field(default="Active") # Active, Completed, Archived
    
    # Calculated cache fields
    progress_percentage: float = Field(default=0.0)
    monthly_required_saving: float = Field(default=0.0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def __init__(self, **data):
        # Sync name/title and target_date/deadline
        if "name" in data and "title" not in data:
            data["title"] = data["name"]
        elif "title" in data and "name" not in data:
            data["name"] = data["title"]
            
        if "target_date" in data and "deadline" not in data:
            data["deadline"] = data["target_date"]
        elif "deadline" in data and "target_date" not in data:
            data["target_date"] = data["deadline"]
            
        super().__init__(**data)
