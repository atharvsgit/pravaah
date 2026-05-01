"""
Offline storage service for handling reports when internet is unavailable
"""
import aiosqlite
import json
import logging
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional
from app.db.sqlite_setup import get_sqlite_connection, SQLITE_DB_PATH
from app.models.offline_models import (
    OfflineReportCreate, 
    OfflineReportResponse, 
    OfflineMediaCreate,
    OfflineMediaResponse,
    SyncStatus
)

logger = logging.getLogger(__name__)

# Directory for storing offline media files
OFFLINE_MEDIA_DIR = Path("offline_media")
OFFLINE_MEDIA_DIR.mkdir(exist_ok=True)

class OfflineStorageService:
    
    async def store_report_offline(
        self, 
        report_data: OfflineReportCreate,
        media_files: Optional[List[tuple]] = None
    ) -> OfflineReportResponse:
        """Store a report offline in SQLite database"""
        async with get_sqlite_connection() as db:
            # Insert report into offline_reports table
            cursor = await db.execute("""
                INSERT INTO offline_reports (
                    user_id, hazard_type, latitude, longitude, 
                    description, city, created_at, sync_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report_data.user_id,
                report_data.hazard_type,
                report_data.latitude,
                report_data.longitude,
                report_data.description,
                report_data.city,
                datetime.now(timezone.utc),
                SyncStatus.PENDING.value
            ))
            
            offline_report_id = cursor.lastrowid
            await db.commit()
            
            # Store media files if provided
            if media_files:
                await self._store_media_files_offline(offline_report_id, media_files)
            
            # Get the stored report
            report = await self.get_offline_report(offline_report_id)
            logger.info(f"Stored report offline with ID: {offline_report_id}")
            
            return report
    
    async def _store_media_files_offline(
        self, 
        offline_report_id: int, 
        media_files: List[tuple]
    ):
        """Store media files offline"""
        async with get_sqlite_connection() as db:
            for original_path, media_type, metadata in media_files:
                # Copy file to offline media directory
                offline_filename = f"{offline_report_id}_{Path(original_path).name}"
                offline_path = OFFLINE_MEDIA_DIR / offline_filename
                
                try:
                    shutil.copy2(original_path, offline_path)
                    
                    # Store media record in database
                    await db.execute("""
                        INSERT INTO offline_media (
                            offline_report_id, file_path, media_type, 
                            file_metadata, created_at, sync_status
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        offline_report_id,
                        str(offline_path),
                        media_type,
                        json.dumps(metadata) if metadata else None,
                        datetime.now(timezone.utc),
                        SyncStatus.PENDING.value
                    ))
                    
                    logger.info(f"Stored media file offline: {offline_path}")
                    
                except Exception as e:
                    logger.error(f"Failed to store media file offline: {e}")
            
            await db.commit()
    
    async def get_offline_report(self, report_id: int) -> Optional[OfflineReportResponse]:
        """Get offline report by ID"""
        async with get_sqlite_connection() as db:
            cursor = await db.execute("""
                SELECT id, user_id, hazard_type, latitude, longitude, 
                       description, city, created_at, sync_status, 
                       sync_attempts, last_sync_attempt, postgres_id, error_message
                FROM offline_reports 
                WHERE id = ?
            """, (report_id,))
            
            row = await cursor.fetchone()
            if not row:
                return None
            
            return OfflineReportResponse(
                id=row[0],
                user_id=row[1],
                hazard_type=row[2],
                latitude=row[3],
                longitude=row[4],
                description=row[5],
                city=row[6],
                created_at=datetime.fromisoformat(row[7]),
                sync_status=SyncStatus(row[8]),
                sync_attempts=row[9],
                last_sync_attempt=datetime.fromisoformat(row[10]) if row[10] else None,
                postgres_id=row[11],
                error_message=row[12]
            )
    
    async def get_pending_reports(self) -> List[OfflineReportResponse]:
        """Get all reports pending sync"""
        async with get_sqlite_connection() as db:
            cursor = await db.execute("""
                SELECT id, user_id, hazard_type, latitude, longitude, 
                       description, city, created_at, sync_status, 
                       sync_attempts, last_sync_attempt, postgres_id, error_message
                FROM offline_reports 
                WHERE sync_status = ?
                ORDER BY created_at ASC
            """, (SyncStatus.PENDING.value,))
            
            reports = []
            async for row in cursor:
                reports.append(OfflineReportResponse(
                    id=row[0],
                    user_id=row[1],
                    hazard_type=row[2],
                    latitude=row[3],
                    longitude=row[4],
                    description=row[5],
                    city=row[6],
                    created_at=datetime.fromisoformat(row[7]),
                    sync_status=SyncStatus(row[8]),
                    sync_attempts=row[9],
                    last_sync_attempt=datetime.fromisoformat(row[10]) if row[10] else None,
                    postgres_id=row[11],
                    error_message=row[12]
                ))
            
            return reports
    
    async def get_report_media(self, offline_report_id: int) -> List[OfflineMediaResponse]:
        """Get media files for an offline report"""
        async with get_sqlite_connection() as db:
            cursor = await db.execute("""
                SELECT id, offline_report_id, file_path, media_type, 
                       file_metadata, created_at, sync_status, postgres_id
                FROM offline_media 
                WHERE offline_report_id = ?
            """, (offline_report_id,))
            
            media_files = []
            async for row in cursor:
                media_files.append(OfflineMediaResponse(
                    id=row[0],
                    offline_report_id=row[1],
                    file_path=row[2],
                    media_type=row[3],
                    file_metadata=row[4],
                    created_at=datetime.fromisoformat(row[5]),
                    sync_status=SyncStatus(row[6]),
                    postgres_id=row[7]
                ))
            
            return media_files
    
    async def update_report_sync_status(
        self, 
        report_id: int, 
        status: SyncStatus, 
        postgres_id: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Update sync status of an offline report"""
        async with get_sqlite_connection() as db:
            await db.execute("""
                UPDATE offline_reports 
                SET sync_status = ?, 
                    sync_attempts = sync_attempts + 1,
                    last_sync_attempt = ?,
                    postgres_id = COALESCE(?, postgres_id),
                    error_message = ?
                WHERE id = ?
            """, (
                status.value,
                datetime.now(timezone.utc),
                postgres_id,
                error_message,
                report_id
            ))
            await db.commit()
    
    async def update_media_sync_status(
        self,
        media_id: int,
        status: SyncStatus,
        postgres_id: Optional[str] = None
    ):
        """Update sync status of offline media"""
        async with get_sqlite_connection() as db:
            await db.execute("""
                UPDATE offline_media 
                SET sync_status = ?, postgres_id = ?
                WHERE id = ?
            """, (status.value, postgres_id, media_id))
            await db.commit()
    
    async def get_sync_statistics(self) -> dict:
        """Get sync statistics"""
        async with get_sqlite_connection() as db:
            # Count reports by status
            cursor = await db.execute("""
                SELECT sync_status, COUNT(*) 
                FROM offline_reports 
                GROUP BY sync_status
            """)
            
            stats = {"reports": {}, "total_reports": 0}
            async for row in cursor:
                stats["reports"][row[0]] = row[1]
                stats["total_reports"] += row[1]
            
            # Get oldest pending report
            cursor = await db.execute("""
                SELECT MIN(created_at) 
                FROM offline_reports 
                WHERE sync_status = ?
            """, (SyncStatus.PENDING.value,))
            
            row = await cursor.fetchone()
            if row[0]:
                stats["oldest_pending"] = datetime.fromisoformat(row[0])
            
            return stats
    
    async def cleanup_synced_data(self, older_than_days: int = 7):
        """Clean up successfully synced data older than specified days"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=older_than_days)
        
        async with get_sqlite_connection() as db:
            # Get media files to delete
            cursor = await db.execute("""
                SELECT om.file_path 
                FROM offline_media om
                JOIN offline_reports orf ON om.offline_report_id = orf.id
                WHERE orf.sync_status = ? AND orf.created_at < ?
            """, (SyncStatus.SYNCED.value, cutoff_date))
            
            # Delete media files
            async for row in cursor:
                try:
                    Path(row[0]).unlink(missing_ok=True)
                except Exception as e:
                    logger.error(f"Failed to delete media file {row[0]}: {e}")
            
            # Delete synced media records
            await db.execute("""
                DELETE FROM offline_media 
                WHERE offline_report_id IN (
                    SELECT id FROM offline_reports 
                    WHERE sync_status = ? AND created_at < ?
                )
            """, (SyncStatus.SYNCED.value, cutoff_date))
            
            # Delete synced reports
            cursor = await db.execute("""
                DELETE FROM offline_reports 
                WHERE sync_status = ? AND created_at < ?
            """, (SyncStatus.SYNCED.value, cutoff_date))
            
            deleted_count = cursor.rowcount
            await db.commit()
            
            logger.info(f"Cleaned up {deleted_count} synced reports older than {older_than_days} days")
            return deleted_count

# Global offline storage service instance
offline_storage_service = OfflineStorageService()
