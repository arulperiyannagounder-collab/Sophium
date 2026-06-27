import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.core.config import settings

logger = logging.getLogger("qdrant")
logging.basicConfig(level=logging.INFO)

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
                # Setup client
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                    timeout=3.0
                )
                # Try simple health check
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
            # Return dummy 768d vector if no API key is present
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

    def upsert_memory(self, user_id: str, mem_type: str, category: str, content: str, importance: int = 3):
        """Saves a user memory record to vector database."""
        vector = self.get_embeddings(content)
        payload = {
            "user_id": user_id,
            "type": mem_type,
            "category": category,
            "content": content,
            "importance": importance
        }
        
        if self.enabled and self.client:
            try:
                point_id = str(uuid.uuid4())
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
                logger.info(f"Upserted memory to Qdrant: {content[:30]}...")
                return
            except Exception as e:
                logger.error(f"Qdrant upsert failed: {e}. Falling back to in-memory.")
                
        # Fallback storage
        self.fallback_db["sophium_memory"].append({
            "id": str(uuid.uuid4()),
            "vector": vector,
            "payload": payload
        })
        logger.info(f"Saved memory in fallback memory: {content[:30]}...")

    def search_memory(self, user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieves user memory vector matches."""
        vector = self.get_embeddings(query)
        
        if self.enabled and self.client:
            try:
                # Filter by user_id
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id)
                        )
                    ]
                )
                results = self.client.search(
                    collection_name="sophium_memory",
                    query_vector=vector,
                    query_filter=query_filter,
                    limit=limit
                )
                return [r.payload for r in results]
            except Exception as e:
                logger.error(f"Qdrant search failed: {e}. Falling back to in-memory lookup.")
                
        # In-memory lookup fallback (simple relevance based on token match if vector comparison is too complex)
        matches = []
        for item in self.fallback_db["sophium_memory"]:
            if item["payload"]["user_id"] == user_id:
                # Simple text matching heuristic for demo
                score = 0
                query_tokens = query.lower().split()
                content_lower = item["payload"]["content"].lower()
                for token in query_tokens:
                    if token in content_lower:
                        score += 1
                matches.append((item["payload"], score))
        
        # Sort by match score and return
        matches.sort(key=lambda x: x[1], reverse=True)
        return [m[0] for m in matches[:limit]]

    def get_conversation_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves past chat memory elements from vector store."""
        if self.enabled and self.client:
            try:
                query_filter = Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                        FieldCondition(key="type", match=MatchValue(value="core_chat_context"))
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
            if p["user_id"] == user_id and p["type"] == "core_chat_context":
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
            score = 0
            query_tokens = query.lower().split()
            content_lower = item["payload"]["content"].lower()
            for token in query_tokens:
                if token in content_lower:
                    score += 1
            matches.append((item["payload"], score))
            
        matches.sort(key=lambda x: x[1], reverse=True)
        return [m[0] for m in matches[:limit]]

# Singleton service instance
qdrant_service = QdrantService()
