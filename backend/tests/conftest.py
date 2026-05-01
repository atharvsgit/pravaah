"""
Set required env vars before any app imports so Settings() doesn't crash
when DATABASE_URL / SECRET_KEY are absent in CI.
"""
import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("ENVIRONMENT", "development")
