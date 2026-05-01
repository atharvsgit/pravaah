"""
SQLite database setup for offline sync functionality
"""
import aiosqlite
import asyncio
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# SQLite database file path
SQLITE_DB_PATH = Path("offline_data.db")

async def init_sqlite_db():
    """Initialize SQLite database with required tables"""
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        # Create offline_reports table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS offline_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                hazard_type TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                description TEXT,
                city TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                sync_attempts INTEGER DEFAULT 0,
                last_sync_attempt TIMESTAMP,
                postgres_id TEXT,
                error_message TEXT
            )
        """)
        
        # Create offline_media table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS offline_media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                offline_report_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                media_type TEXT NOT NULL,
                file_metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                postgres_id TEXT,
                FOREIGN KEY (offline_report_id) REFERENCES offline_reports (id)
            )
        """)
        
        # Create sync_status table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sync_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                last_sync_attempt TIMESTAMP,
                last_successful_sync TIMESTAMP,
                pending_reports_count INTEGER DEFAULT 0,
                failed_reports_count INTEGER DEFAULT 0,
                is_online BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_offline_reports_sync_status 
            ON offline_reports(sync_status)
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_offline_reports_user_id 
            ON offline_reports(user_id)
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_offline_media_report_id 
            ON offline_media(offline_report_id)
        """)
        
        await db.commit()
        logger.info("SQLite database initialized successfully")

def get_sqlite_connection():
    """Get SQLite database connection"""
    return aiosqlite.connect(SQLITE_DB_PATH)

if __name__ == "__main__":
    # Initialize the database
    asyncio.run(init_sqlite_db())