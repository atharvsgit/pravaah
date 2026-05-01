"""
Sync service to synchronize offline data with PostgreSQL database
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import List, Optional
from pathlib import Path

from app.services.offline_storage_service import offline_storage_service
from app.services.connectivity_service import connectivity_service
from app.models.offline_models import SyncStatus, SyncResult
from app.db.session import AsyncSessionLocal
from app.db.models import Report, Media, HazardType, ReportStatus, MediaType
from app.services.s3_service import s3_service
from geoalchemy2 import Geography
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self._sync_task: Optional[asyncio.Task] = None
        self._sync_in_progress = False
        self._sync_interval = 60  # seconds
        
    async def start_sync_service(self):
        """Start the background sync service"""
        if self._sync_task and not self._sync_task.done():
            return
            
        # Add connectivity callback to trigger sync when online
        connectivity_service.add_connectivity_callback(self._on_connectivity_change)
        
        self._sync_task = asyncio.create_task(self._sync_monitor())
        logger.info("Started sync service")
    
    async def stop_sync_service(self):
        """Stop the background sync service"""
        connectivity_service.remove_connectivity_callback(self._on_connectivity_change)
        
        if self._sync_task:
            self._sync_task.cancel()
            try:
                await self._sync_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped sync service")
    
    async def _on_connectivity_change(self, is_online: bool):
        """Callback when connectivity status changes"""
        if is_online and not self._sync_in_progress:
            logger.info("Connection restored, triggering sync")
            asyncio.create_task(self.sync_offline_data())
    
    async def _sync_monitor(self):
        """Background task to periodically sync data"""
        while True:
            try:
                if connectivity_service.is_online and not self._sync_in_progress:
                    await self.sync_offline_data()
                await asyncio.sleep(self._sync_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in sync monitor: {e}")
                await asyncio.sleep(self._sync_interval)
    
    async def sync_offline_data(self) -> SyncResult:
        """Sync all pending offline data to PostgreSQL"""
        if self._sync_in_progress:
            return SyncResult(
                success=False,
                synced_reports=0,
                failed_reports=0,
                errors=["Sync already in progress"]
            )
        
        self._sync_in_progress = True
        synced_count = 0
        failed_count = 0
        errors = []
        
        try:
            # Check connectivity first
            if not connectivity_service.is_online:
                await connectivity_service.update_connectivity_status()
                if not connectivity_service.is_online:
                    return SyncResult(
                        success=False,
                        synced_reports=0,
                        failed_reports=0,
                        errors=["No internet connection available"]
                    )
            
            # Get pending reports
            pending_reports = await offline_storage_service.get_pending_reports()
            logger.info(f"Found {len(pending_reports)} reports to sync")
            
            for report in pending_reports:
                try:
                    # Update status to syncing
                    await offline_storage_service.update_report_sync_status(
                        report.id, SyncStatus.SYNCING
                    )
                    
                    # Sync the report
                    postgres_id = await self._sync_single_report(report)
                    
                    if postgres_id:
                        # Update status to synced
                        await offline_storage_service.update_report_sync_status(
                            report.id, SyncStatus.SYNCED, postgres_id
                        )
                        synced_count += 1
                        logger.info(f"Successfully synced report {report.id} -> {postgres_id}")
                    else:
                        # Update status to failed
                        await offline_storage_service.update_report_sync_status(
                            report.id, SyncStatus.FAILED, error_message="Failed to sync to PostgreSQL"
                        )
                        failed_count += 1
                        errors.append(f"Failed to sync report {report.id}")
                        
                except Exception as e:
                    error_msg = f"Error syncing report {report.id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    failed_count += 1
                    
                    # Update status to failed with error
                    await offline_storage_service.update_report_sync_status(
                        report.id, SyncStatus.FAILED, error_message=str(e)
                    )
            
            # Clean up old synced data
            try:
                await offline_storage_service.cleanup_synced_data(older_than_days=7)
            except Exception as e:
                logger.error(f"Error during cleanup: {e}")
            
            result = SyncResult(
                success=failed_count == 0,
                synced_reports=synced_count,
                failed_reports=failed_count,
                errors=errors,
                details=f"Synced {synced_count} reports, {failed_count} failed"
            )
            
            logger.info(f"Sync completed: {result.details}")
            return result
            
        finally:
            self._sync_in_progress = False
    
    async def _sync_single_report(self, offline_report) -> Optional[str]:
        """Sync a single offline report to PostgreSQL"""
        try:
            async with AsyncSessionLocal() as session:
                # Create PostgreSQL report
                postgres_report = Report(
                    id=uuid.uuid4(),
                    user_id=uuid.UUID(offline_report.user_id),
                    user_hazard_type=HazardType(offline_report.hazard_type),
                    user_location=Geography(f'POINT({offline_report.longitude} {offline_report.latitude})'),
                    user_description=offline_report.description,
                    user_city=offline_report.city,
                    status=ReportStatus.SUBMITTED,
                    created_at=offline_report.created_at
                )
                
                session.add(postgres_report)
                await session.flush()  # Get the ID
                
                # Sync media files
                media_files = await offline_storage_service.get_report_media(offline_report.id)
                for media in media_files:
                    try:
                        # Upload media to S3
                        media_path = Path(media.file_path)
                        if media_path.exists():
                            s3_key = f"reports/{postgres_report.id}/{media_path.name}"
                            s3_url = await s3_service.upload_file(str(media_path), s3_key)
                            
                            # Create PostgreSQL media record
                            postgres_media = Media(
                                id=uuid.uuid4(),
                                report_id=postgres_report.id,
                                file_url=s3_url,
                                media_type=MediaType(media.media_type),
                                file_metadata=media.file_metadata,
                                created_at=media.created_at
                            )
                            
                            session.add(postgres_media)
                            
                            # Update offline media sync status
                            await offline_storage_service.update_media_sync_status(
                                media.id, SyncStatus.SYNCED, str(postgres_media.id)
                            )
                        else:
                            logger.warning(f"Media file not found: {media.file_path}")
                            
                    except Exception as e:
                        logger.error(f"Failed to sync media {media.id}: {e}")
                        await offline_storage_service.update_media_sync_status(
                            media.id, SyncStatus.FAILED
                        )
                
                await session.commit()
                return str(postgres_report.id)
                
        except SQLAlchemyError as e:
            logger.error(f"Database error syncing report {offline_report.id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error syncing report {offline_report.id}: {e}")
            return None
    
    async def retry_failed_syncs(self) -> SyncResult:
        """Retry syncing reports that previously failed"""
        if not connectivity_service.is_online:
            return SyncResult(
                success=False,
                synced_reports=0,
                failed_reports=0,
                errors=["No internet connection available"]
            )
        
        # Reset failed reports to pending for retry
        async with offline_storage_service.get_sqlite_connection() as db:
            await db.execute("""
                UPDATE offline_reports 
                SET sync_status = ?, error_message = NULL
                WHERE sync_status = ?
            """, (SyncStatus.PENDING.value, SyncStatus.FAILED.value))
            await db.commit()
        
        # Sync the pending reports
        return await self.sync_offline_data()
    
    @property
    def is_syncing(self) -> bool:
        """Check if sync is currently in progress"""
        return self._sync_in_progress

# Global sync service instance
sync_service = SyncService()