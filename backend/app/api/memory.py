import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.models.user import User
from app.services.qdrant_service import qdrant_service
from app.core.response import make_response, StandardResponse

logger = logging.getLogger("api.memory")
router = APIRouter(prefix="/memory", tags=["memory"])

# --- Schemas ---

class MemoryStoreRequest(BaseModel):
    memory_type: str # semantic, financial_profile, goal, conversation, preference
    category: str
    content: str
    importance: int = 3
    metadata: Optional[Dict[str, Any]] = None

class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = None
    importance: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

# --- Routes ---

@router.post("", response_model=StandardResponse)
def store_user_memory(
    body: MemoryStoreRequest, 
    current_user: User = Depends(get_current_user)
):
    """Stores a new financial preference, goal fact, semantic memory, or conversation context in Qdrant."""
    try:
        point_id = qdrant_service.store_memory(
            user_id=current_user.id,
            memory_type=body.memory_type,
            category=body.category,
            content=body.content,
            importance=body.importance,
            metadata=body.metadata
        )
        return make_response(
            success=True,
            message="Memory successfully stored in vector database",
            data={"point_id": point_id}
        )
    except Exception as e:
        logger.error(f"Error storing memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search", response_model=StandardResponse)
def search_memories(
    query: str,
    memory_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 5,
    current_user: User = Depends(get_current_user)
):
    """Searches user memories matching filters and ranked by semantic similarity (Top-K)."""
    try:
        results = qdrant_service.search_similar_memory(
            user_id=current_user.id,
            query=query,
            memory_type=memory_type,
            category=category,
            limit=limit
        )
        return make_response(
            success=True,
            message="Memory similarity search completed successfully",
            data=results
        )
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{point_id}", response_model=StandardResponse)
def retrieve_memory(point_id: str, current_user: User = Depends(get_current_user)):
    """Retrieves a specific memory by its ID, checking authorization ownership."""
    try:
        memory = qdrant_service.retrieve_memory(point_id)
        if not memory:
            raise HTTPException(status_code=404, detail="Memory point not found")
            
        # Verify ownership
        if memory.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this memory")
            
        return make_response(
            success=True,
            message="Memory retrieved successfully",
            data=memory
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving memory {point_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{point_id}", response_model=StandardResponse)
def update_memory(
    point_id: str, 
    body: MemoryUpdateRequest, 
    current_user: User = Depends(get_current_user)
):
    """Updates specific fields of an existing memory point."""
    try:
        # Check existence and ownership
        existing = qdrant_service.retrieve_memory(point_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Memory point not found")
        if existing.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this memory")
            
        updated = qdrant_service.update_memory(
            point_id=point_id,
            content=body.content,
            importance=body.importance,
            metadata=body.metadata
        )
        
        return make_response(
            success=True,
            message="Memory point updated successfully" if updated else "Update failed",
            data={"point_id": point_id, "updated": updated}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating memory {point_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{point_id}", response_model=StandardResponse)
def delete_memory(point_id: str, current_user: User = Depends(get_current_user)):
    """Deletes a specific memory point from the database."""
    try:
        # Check existence and ownership
        existing = qdrant_service.retrieve_memory(point_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Memory point not found")
        if existing.get("user_id") != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this memory")
            
        deleted = qdrant_service.delete_memory(point_id)
        
        return make_response(
            success=True,
            message="Memory deleted successfully" if deleted else "Deletion failed",
            data={"point_id": point_id, "deleted": deleted}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting memory {point_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
