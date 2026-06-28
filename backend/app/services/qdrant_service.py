import logging
import uuid
import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.core.config import settings

logger = logging.getLogger("qdrant")
logging.basicConfig(level=logging.INFO)

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot_prod = sum(x * y for x, y in zip(v1, v2))
    mag1 = math.sqrt(sum(x * x for x in v1))
    mag2 = math.sqrt(sum(x * x for x in v2))
    if mag1 * mag2 == 0:
        return 0.0
    return dot_prod / (mag1 * mag2)

class QdrantService:
    def __init__(self):
        self.enabled = False
        self.client = None
        # In-memory fallback database for hackathon robustness
        self.fallback_db: Dict[str, List[Dict[str, Any]]] = {
            "sophium_memory": [],
            "sophium_knowledge": []
        }
        
        try:
            if settings.QDRANT_URL:
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                    timeout=3.0
                )
                self.client.get_collections()
                self.enabled = True
                logger.info("Successfully connected to Qdrant.")
                self._init_collections()
        except Exception as e:
            logger.warning(f"Could not connect to Qdrant at {settings.QDRANT_URL}: {e}. Running in memory-fallback mode.")
            self.enabled = False

    def _init_collections(self):
        try:
            existing = [c.name for c in self.client.get_collections().collections]
            for col in ["sophium_memory", "sophium_knowledge"]:
                if col not in existing:
                    # Using Gemini embedding size (768)
                    self.client.create_collection(
                        collection_name=col,
                        vectors_config=VectorParams(size=768, distance=Distance.COSINE)
                    )
                    logger.info(f"Initialized collection: {col}")
        except Exception as e:
            logger.error(f"Error creating collections in Qdrant: {e}")
            self.enabled = False

    def get_embeddings(self, text: str) -> List[float]:
        """Generates embedding using standard Gemini client or fallback mock vector."""
        if not settings.GEMINI_API_KEY:
            return [0.1] * 768
            
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Error calling Gemini Embedding API: {e}")
            return [0.1] * 768

    # --- Phase 2 Memory Engine Core Methods ---

    def store_memory(
        self, 
        user_id: str, 
        memory_type: str, 
        category: str, 
        content: str, 
        importance: int = 3, 
        metadata: Optional[Dict[str, Any]] = None, 
        point_id: Optional[str] = None
    ) -> str:
        """Stores or updates a memory in the Qdrant database / local fallback."""
        if not point_id:
            point_id = str(uuid.uuid4())
            
        vector = self.get_embeddings(content)
        payload = {
            "user_id": user_id,
            "memory_type": memory_type,
            "category": category,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "importance": importance,
            "metadata": metadata or {}
        }
        
        # Compatibility with legacy code payload structure
        payload["type"] = memory_type 

        if self.enabled and self.client:
            try:
                self.client.upsert(
                    collection_name="sophium_memory",
                    points=[
                        PointStruct(
                            id=point_id,
                            vector=vector,
                            payload=payload
                        )
                    ]
                )
                logger.info(f"Stored memory in Qdrant (ID: {point_id}, Type: {memory_type}): {content[:40]}...")
                return point_id
            except Exception as e:
                logger.error(f"Qdrant store_memory failed: {e}. Falling back to in-memory.")

        # In-memory fallback
        # Check if already exists to update, else append
        exists = False
        for item in self.fallback_db["sophium_memory"]:
            if item["id"] == point_id:
                item["vector"] = vector
                item["payload"] = payload
                exists = True
                break
        if not exists:
            self.fallback_db["sophium_memory"].append({
                "id": point_id,
                "vector": vector,
                "payload": payload
            })
        logger.info(f"Stored memory in local fallback (ID: {point_id}, Type: {memory_type}): {content[:40]}...")
        return point_id

    def retrieve_memory(self, point_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific memory by its ID."""
        if self.enabled and self.client:
            try:
                res = self.client.retrieve(
                    collection_name="sophium_memory",
                    ids=[point_id]
                )
                if res:
                    payload = res[0].payload
                    payload["id"] = res[0].id
                    return payload
            except Exception as e:
                logger.error(f"Qdrant retrieve_memory failed: {e}. Checking fallback.")

        # Fallback
        for item in self.fallback_db["sophium_memory"]:
            if item["id"] == point_id:
                payload = dict(item["payload"])
                payload["id"] = item["id"]
                return payload
        return None

    def update_memory(
        self, 
        point_id: str, 
        content: Optional[str] = None, 
        importance: Optional[int] = None, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Updates specific fields of an existing memory."""
        existing = self.retrieve_memory(point_id)
        if not existing:
            return False

        updated_content = content if content is not None else existing.get("content", "")
        updated_importance = importance if importance is not None else existing.get("importance", 3)
        
        current_metadata = existing.get("metadata", {})
        if metadata is not None:
            current_metadata.update(metadata)

        user_id = existing.get("user_id", "")
        memory_type = existing.get("memory_type", existing.get("type", "semantic"))
        category = existing.get("category", "")

        self.store_memory(
            user_id=user_id,
            memory_type=memory_type,
            category=category,
            content=updated_content,
            importance=updated_importance,
            metadata=current_metadata,
            point_id=point_id
        )
        return True

    def delete_memory(self, point_id: str) -> bool:
        """Deletes a memory by its ID."""
        deleted = False
        if self.enabled and self.client:
            try:
                self.client.delete(
                    collection_name="sophium_memory",
                    points_selector=[point_id]
                )
                logger.info(f"Deleted memory from Qdrant: {point_id}")
                deleted = True
            except Exception as e:
                logger.error(f"Qdrant delete_memory failed: {e}. Checking fallback.")

        # Local fallback
        original_len = len(self.fallback_db["sophium_memory"])
        self.fallback_db["sophium_memory"] = [
            item for item in self.fallback_db["sophium_memory"] if item["id"] != point_id
        ]
        if len(self.fallback_db["sophium_memory"]) < original_len:
            logger.info(f"Deleted memory from local fallback: {point_id}")
            deleted = True
            
        return deleted

    def search_similar_memory(
        self, 
        user_id: str, 
        query: str, 
        memory_type: Optional[str] = None, 
        category: Optional[str] = None, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Retrieves user memories matching filters and ranking by semantic similarity."""
        vector = self.get_embeddings(query)

        if self.enabled and self.client:
            try:
                conditions = [
                    FieldCondition(key="user_id", match=MatchValue(value=user_id))
                ]
                if memory_type:
                    conditions.append(FieldCondition(key="memory_type", match=MatchValue(value=memory_type)))
                if category:
                    conditions.append(FieldCondition(key="category", match=MatchValue(value=category)))

                query_filter = Filter(must=conditions)
                results = self.client.search(
                    collection_name="sophium_memory",
                    query_vector=vector,
                    query_filter=query_filter,
                    limit=limit
                )
                output = []
                for r in results:
                    p = dict(r.payload)
                    p["id"] = r.id
                    p["score"] = r.score
                    output.append(p)
                return output
            except Exception as e:
                logger.error(f"Qdrant search_similar_memory failed: {e}. Checking fallback.")

        # Fallback Vector Search
        matches = []
        for item in self.fallback_db["sophium_memory"]:
            p = item["payload"]
            if p["user_id"] == user_id:
                if memory_type and p.get("memory_type") != memory_type and p.get("type") != memory_type:
                    continue
                if category and p.get("category") != category:
                    continue
                
                score = cosine_similarity(vector, item["vector"])
                
                # Check for token text matching to boost score if embeddings are dummy
                query_tokens = query.lower().split()
                content_lower = p["content"].lower()
                token_matches = sum(1 for token in query_tokens if token in content_lower)
                if token_matches > 0:
                    score += 0.1 * token_matches
                    
                p_copy = dict(p)
                p_copy["id"] = item["id"]
                p_copy["score"] = score
                matches.append(p_copy)

        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches[:limit]

    def delete_memories_by_filter(
        self, 
        user_id: str, 
        memory_type: Optional[str] = None, 
        category: Optional[str] = None, 
        metadata_filter: Optional[Dict[str, Any]] = None
    ) -> int:
        """Deletes memories matching specific filter criteria. Returns count of deleted records."""
        count = 0
        
        # Read matching points first
        matching_ids = []
        if self.enabled and self.client:
            try:
                conditions = [FieldCondition(key="user_id", match=MatchValue(value=user_id))]
                if memory_type:
                    conditions.append(FieldCondition(key="memory_type", match=MatchValue(value=memory_type)))
                if category:
                    conditions.append(FieldCondition(key="category", match=MatchValue(value=category)))
                
                query_filter = Filter(must=conditions)
                res, _ = self.client.scroll(
                    collection_name="sophium_memory",
                    scroll_filter=query_filter,
                    limit=100
                )
                for point in res:
                    # check metadata filter
                    match = True
                    if metadata_filter:
                        p_meta = point.payload.get("metadata", {})
                        for k, v in metadata_filter.items():
                            if p_meta.get(k) != v:
                                match = False
                                break
                    if match:
                        matching_ids.append(point.id)
            except Exception as e:
                logger.error(f"Qdrant scroll for delete filter failed: {e}")

        # Delete from Qdrant
        if matching_ids and self.enabled and self.client:
            try:
                self.client.delete(
                    collection_name="sophium_memory",
                    points_selector=matching_ids
                )
                count = len(matching_ids)
            except Exception as e:
                logger.error(f"Qdrant delete by ID list failed: {e}")

        # Fallback / local consistency
        fallback_remains = []
        fallback_deleted_count = 0
        for item in self.fallback_db["sophium_memory"]:
            p = item["payload"]
            if p["user_id"] == user_id:
                type_matches = (not memory_type) or (p.get("memory_type") == memory_type or p.get("type") == memory_type)
                cat_matches = (not category) or (p.get("category") == category)
                
                meta_matches = True
                if metadata_filter:
                    p_meta = p.get("metadata", {})
                    for k, v in metadata_filter.items():
                        if p_meta.get(k) != v:
                            meta_matches = False
                            break
                
                if type_matches and cat_matches and meta_matches:
                    fallback_deleted_count += 1
                    continue
            fallback_remains.append(item)
            
        self.fallback_db["sophium_memory"] = fallback_remains
        return max(count, fallback_deleted_count)

    # --- Legacy Compatibility wrappers ---

    def upsert_memory(self, user_id: str, mem_type: str, category: str, content: str, importance: int = 3):
        return self.store_memory(
            user_id=user_id,
            memory_type=mem_type,
            category=category,
            content=content,
            importance=importance
        )

    def search_memory(self, user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        return self.search_similar_memory(user_id=user_id, query=query, limit=limit)

    def get_conversation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves past chat memory elements from vector store."""
        if self.enabled and self.client:
            try:
                query_filter = Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                        FieldCondition(key="memory_type", match=MatchValue(value="core_chat_context"))
                    ]
                )
                results, _ = self.client.scroll(
                    collection_name="sophium_memory",
                    scroll_filter=query_filter,
                    limit=limit
                )
                return [r.payload for r in results]
            except Exception as e:
                logger.error(f"Qdrant scroll query failed: {e}. Falling back to in-memory history.")
                
        matches = []
        for item in self.fallback_db["sophium_memory"]:
            p = item["payload"]
            if p["user_id"] == user_id and (p.get("memory_type") == "core_chat_context" or p.get("type") == "core_chat_context"):
                matches.append(p)
        return matches[-limit:]

    def upsert_knowledge(self, category: str, content: str):
        """Saves dynamic financial RAG knowledge data."""
        vector = self.get_embeddings(content)
        payload = {
            "category": category,
            "content": content
        }
        
        if self.enabled and self.client:
            try:
                point_id = str(uuid.uuid4())
                self.client.upsert(
                    collection_name="sophium_knowledge",
                    points=[
                        PointStruct(
                            id=point_id,
                            vector=vector,
                            payload=payload
                        )
                    ]
                )
                logger.info(f"Upserted knowledge to Qdrant: {content[:30]}...")
                return
            except Exception as e:
                logger.error(f"Qdrant knowledge upsert failed: {e}.")
                
        self.fallback_db["sophium_knowledge"].append({
            "id": str(uuid.uuid4()),
            "vector": vector,
            "payload": payload
        })

    def search_knowledge(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Retrieves domain financial facts (RAG)."""
        vector = self.get_embeddings(query)
        
        if self.enabled and self.client:
            try:
                results = self.client.search(
                    collection_name="sophium_knowledge",
                    query_vector=vector,
                    limit=limit
                )
                return [r.payload for r in results]
            except Exception as e:
                logger.error(f"Qdrant knowledge search failed: {e}.")
                
        # Fallback text lookup
        matches = []
        for item in self.fallback_db["sophium_knowledge"]:
            score = cosine_similarity(vector, item["vector"])
            
            query_tokens = query.lower().split()
            content_lower = item["payload"]["content"].lower()
            token_matches = sum(1 for token in query_tokens if token in content_lower)
            if token_matches > 0:
                score += 0.1 * token_matches
                
            p = dict(item["payload"])
            p["score"] = score
            matches.append(p)
            
        matches.sort(key=lambda x: x.get("score", 0.0), reverse=True)
        return [m for m in matches[:limit]]

# Singleton service instance
qdrant_service = QdrantService()
