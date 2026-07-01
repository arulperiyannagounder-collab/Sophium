import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./sophium.db"
    JWT_SECRET_KEY: str = "supersecretkey_changeinproduction_forhackathon2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    GEMINI_API_KEY: str = ""
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

# Instantiate settings
settings = Settings()
