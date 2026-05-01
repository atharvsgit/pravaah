from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

# Create engine with production-ready settings
engine_kwargs = {
    "echo": os.getenv("ENVIRONMENT", "development") == "development",  # Only echo in dev
    "future": True,
    "pool_pre_ping": True,  # Verify connections before use
    "pool_recycle": 300,    # Recycle connections every 5 minutes
}

# Handle different database URL formats
database_url = settings.DATABASE_URL
if not database_url.startswith("postgresql+asyncpg://"):
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(database_url, **engine_kwargs)

AsyncSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

