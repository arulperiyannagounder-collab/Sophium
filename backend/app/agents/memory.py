import logging
from typing import Dict, Any, List
from google.adk import Agent
from app.services.qdrant_service import qdrant_service
from app.core.config import settings

logger = logging.getLogger("agents.memory")

# Define tools for ADK Memory Agent
def retrieve_user_memories(user_id: str, query: str) -> List[Dict[str, Any]]:
    """Retrieves user-specific financial profile, goals, and preference memory from Qdrant vector store."""
    return qdrant_service.search_memory(user_id=user_id, query=query, limit=4)

def save_user_memory(user_id: str, mem_type: str, category: str, content: str, importance: int = 3) -> str:
    """Saves a user financial preference, goal, profile fact, or habit to Qdrant vector memory.
    
    Args:
        user_id: The unique user UUID
        mem_type: One of 'profile_fact', 'goal_record', 'financial_preference', or 'core_chat_context'
        category: Category (e.g. income, expense, goal, investment, general)
        content: The text describing the memory fact
        importance: Numerical score 1-5 (5 is highest)
    """
    qdrant_service.upsert_memory(
        user_id=user_id,
        mem_type=mem_type,
        category=category,
        content=content,
        importance=importance
    )
    return "Memory successfully stored."

# Configure the ADK Agent
memory_agent = Agent(
    name="MemoryAgent",
    model="gemini-2.5-flash",
    instruction="""
    You are Sophium's MemoryAgent. You manage the user's multi-layered long-term financial memory in Qdrant.
    Your responsibilities are:
    1. Retrieve relevant facts, financial habits, goals, and preferences using retrieve_user_memories.
    2. Identify new profile updates, goals, or financial constraints from inputs and save them using save_user_memory.
    3. Standardize and organize user memory contexts.
    
    Always return a clean list of facts you have loaded or written.
    """,
    tools=[retrieve_user_memories, save_user_memory]
)
