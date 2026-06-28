import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, chat, goals, transactions, financials, memory
from app.services.scheduler_service import scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Starting up Sophium Backend...")
    init_db()
    logger.info("SQLite Database initialized.")
    
    # Start proactive background scheduler
    scheduler.start()
    
    yield
    
    # Shutdown tasks
    logger.info("Shutting down Sophium Backend...")
    scheduler.shutdown()

app = FastAPI(
    title="Sophium API",
    description="Backend API for Sophium AI Personal CFO Agentic System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route mounting
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(financials.router, prefix="/api")
app.include_router(memory.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "Sophium API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
