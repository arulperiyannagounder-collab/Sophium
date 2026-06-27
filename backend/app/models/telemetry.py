from typing import List, Optional, Any
from pydantic import BaseModel

class AgentTraceStep(BaseModel):
    agent: str
    step: int
    execution_time_ms: float
    action_taken: str

class TelemetryData(BaseModel):
    total_execution_time_ms: float
    qdrant_memory_retrievals: int
    qdrant_rag_hits: int
    trace: List[AgentTraceStep]

class CFOAPIResponse(BaseModel):
    text_recommendation: str
    data_payload: Optional[Any] = None
    telemetry: TelemetryData
