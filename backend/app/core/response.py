from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    timestamp: str
    errors: Optional[Any] = None

def make_response(
    success: bool = True, 
    message: str = "Operation successful", 
    data: Optional[Any] = None, 
    errors: Optional[Any] = None
) -> dict:
    return {
        "success": success,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
        "errors": errors
    }
