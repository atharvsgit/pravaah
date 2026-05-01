# Configuration for AI Worker
import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """Configuration settings for the AI worker"""
    
    # Google Gemini API Configuration
    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key")
    
    # Hugging Face Configuration
    HUGGING_FACE_TOKEN: str = Field(..., description="Hugging Face API token")
    
    # RabbitMQ Configuration
    RABBITMQ_URL: str = Field(default="amqp://localhost:5672/", description="RabbitMQ connection URL")
    
    # Backend API Configuration
    BACKEND_URL: str = Field(default="http://localhost:8000", description="Backend API base URL")
    
    # PostgreSQL Configuration
    POSTGRES_HOST: str = Field(default="localhost", description="PostgreSQL host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL port")
    POSTGRES_DB: str = Field(default="pravaah_db", description="PostgreSQL database name")
    POSTGRES_USER: str = Field(default="postgres", description="PostgreSQL username")
    POSTGRES_PASSWORD: str = Field(default="atharv", description="PostgreSQL password")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Create settings instance
settings = Settings()

# Export commonly used configurations
HUGGING_FACE_TOKEN = settings.HUGGING_FACE_TOKEN
RABBITMQ_URL = settings.RABBITMQ_URL
BACKEND_URL = settings.BACKEND_URL

# PostgreSQL connection config for social media processor
POSTGRES_CONFIG = {
    "host": settings.POSTGRES_HOST,
    "port": settings.POSTGRES_PORT,
    "database": settings.POSTGRES_DB,
    "user": settings.POSTGRES_USER,
    "password": settings.POSTGRES_PASSWORD
}

