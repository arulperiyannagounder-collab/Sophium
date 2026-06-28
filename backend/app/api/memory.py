import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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

class KnowledgeStoreRequest(BaseModel):
    category: str
    content: str

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

# --- RAG Knowledge Base Routes ---

@router.get("/knowledge", response_model=StandardResponse)
def get_rag_knowledge(
    query: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Retrieves all dynamic RAG knowledge vectors, optionally filtered/ranked by a search query."""
    try:
        if query:
            results = qdrant_service.search_knowledge(query, limit=15)
        else:
            results = qdrant_service.get_all_knowledge(limit=100)
        return make_response(
            success=True,
            message="Knowledge base search completed",
            data=results
        )
    except Exception as e:
        logger.error(f"Error listing knowledge base: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge", response_model=StandardResponse)
def store_rag_knowledge(
    body: KnowledgeStoreRequest,
    current_user: User = Depends(get_current_user)
):
    """Manually registers a new dynamic RAG fact or tax rule in Qdrant."""
    try:
        point_id = qdrant_service.upsert_knowledge(
            category=body.category,
            content=body.content
        )
        return make_response(
            success=True,
            message="Knowledge successfully stored in RAG collection",
            data={"point_id": point_id}
        )
    except Exception as e:
        logger.error(f"Error storing knowledge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/knowledge/{point_id}", response_model=StandardResponse)
def delete_rag_knowledge(
    point_id: str,
    current_user: User = Depends(get_current_user)
):
    """Deletes a dynamic knowledge chunk from Qdrant knowledge base."""
    try:
        deleted = qdrant_service.delete_knowledge(point_id)
        return make_response(
            success=True,
            message="Knowledge chunk deleted successfully" if deleted else "Deletion failed",
            data={"point_id": point_id, "deleted": deleted}
        )
    except Exception as e:
        logger.error(f"Error deleting knowledge chunk {point_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/knowledge/upload", response_model=StandardResponse)
async def upload_knowledge_document(
    file: UploadFile = File(...),
    category: str = "user_upload",
    current_user: User = Depends(get_current_user)
):
    """Ingests a text/markdown document, splits it into paragraph chunks, and saves them to Qdrant knowledge base."""
    filename = file.filename.lower() if file.filename else ""
    if not (filename.endswith(".txt") or filename.endswith(".md") or filename.endswith(".csv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only text (.txt), markdown (.md) or CSV (.csv) files are supported for dynamic document ingestion."
        )
        
    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="ignore")
        
        raw_chunks = [c.strip() for c in content.split("\n\n")]
        chunks = [c for c in raw_chunks if len(c) > 20]
        
        if not chunks:
            raw_chunks = [c.strip() for c in content.split("\n")]
            chunks = [c for c in raw_chunks if len(c) > 20]
            
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content is empty or contains no readable paragraphs."
            )
            
        point_ids = []
        for chunk in chunks:
            trimmed_chunk = chunk[:2000]
            point_id = qdrant_service.upsert_knowledge(
                category=category,
                content=f"Document Fact: {trimmed_chunk}"
            )
            point_ids.append(point_id)
            
        return make_response(
            success=True,
            message=f"Successfully ingested document '{file.filename}'. Generated {len(chunks)} knowledge base chunks.",
            data={"point_ids": point_ids, "chunks_count": len(chunks)}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ingesting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}"
        )

