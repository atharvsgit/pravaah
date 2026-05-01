from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """
    Manages all application settings and environment variables.
    """
    # --- Core Services ---
    DATABASE_URL: str
    SYNC_DATABASE_URL: Optional[str] = None
    RABBITMQ_URL: Optional[str] = None
    
    # --- Render.com Port ---
    PORT: int = 8000
    
    # --- JWT Security ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # --- AWS S3 Settings ---
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET_NAME: Optional[str] = None
    AWS_S3_REGION: Optional[str] = None

    WEATHERAPI_KEY: Optional[str] = None
    
    # --- AI/LLM Settings ---
    GEMINI_API_KEY: Optional[str] = None
    HUGGING_FACE_TOKEN: Optional[str] = None
    
    # --- Backend URL ---
    BACKEND_URL: Optional[str] = None
    
    # --- Frontend URL (for CORS) ---
    FRONTEND_URL: Optional[str] = None
    ENVIRONMENT: str = "development"
    
    # --- Firebase Settings ---
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_CLIENT_ID: Optional[str] = None
    FIREBASE_AUTH_URI: Optional[str] = "https://accounts.google.com/o/oauth2/auth"
    FIREBASE_TOKEN_URI: Optional[str] = "https://oauth2.googleapis.com/token"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding='utf-8',
        case_sensitive=False
    )
    
    @property
    def sync_database_url(self) -> str:
        """Convert async DATABASE_URL to sync version for migrations/sync operations"""
        if self.SYNC_DATABASE_URL:
            return self.SYNC_DATABASE_URL
        # Convert postgresql+asyncpg:// to postgresql://
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace("asyncpg://", "postgresql://")

settings = Settings()

