"""
API endpoints for offline sync status and management
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from app.models.offline_models import (
    SyncStatusResponse, 
    SyncResult, 
    OfflineReportResponse,
    ConnectivityStatus
)
from app.services.sync_service import sync_service
from app.services.connectivity_service import connectivity_service
from app.services.offline_storage_service import offline_storage_service
from app.api.dependencies import get_current_user
from app.db.models import User

router = APIRouter()

@router.get("/connectivity", response_model=ConnectivityStatus, summary="Get current connectivity status")
async def get_connectivity_status():
    """Get the current internet connectivity status"""
    return await connectivity_service.update_connectivity_status()

@router.get("/status", response_model=dict, summary="Get sync status and statistics")
async def get_sync_status():
    """Get comprehensive sync status including pending reports and statistics"""
    try:
        # Get connectivity status
        connectivity_status = connectivity_service.get_status()
        
        # Get sync statistics
        stats = await offline_storage_service.get_sync_statistics()
        
        # Get pending reports count
        pending_reports = await offline_storage_service.get_pending_reports()
        
        return {
            "connectivity": {
                "is_online": connectivity_status.is_online,
                "last_check": connectivity_status.last_check
            },
            "sync": {
                "is_syncing": sync_service.is_syncing,
                "pending_reports": len(pending_reports),
                "statistics": stats
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sync status: {str(e)}")

@router.get("/pending-reports", response_model=List[OfflineReportResponse], summary="Get all pending offline reports")
async def get_pending_reports(current_user: User = Depends(get_current_user)):
    """Get all reports pending synchronization"""
    try:
        pending_reports = await offline_storage_service.get_pending_reports()
        
        # Filter by current user if needed (optional - remove if admin access required)
        user_reports = [
            report for report in pending_reports 
            if report.user_id == str(current_user.id)
        ]
        
        return user_reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pending reports: {str(e)}")

@router.post("/sync/trigger", response_model=SyncResult, summary="Manually trigger sync process")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Manually trigger the sync process for offline reports"""
    try:
        # Check if already syncing
        if sync_service.is_syncing:
            raise HTTPException(status_code=409, detail="Sync already in progress")
        
        # Check connectivity
        connectivity_status = await connectivity_service.update_connectivity_status()
        if not connectivity_status.is_online:
            raise HTTPException(status_code=503, detail="No internet connection available")
        
        # Trigger sync in background
        background_tasks.add_task(sync_service.sync_offline_data)
        
        return SyncResult(
            success=True,
            synced_reports=0,
            failed_reports=0,
            details="Sync process started in background"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger sync: {str(e)}")

@router.post("/sync/retry-failed", response_model=SyncResult, summary="Retry failed sync operations")
async def retry_failed_syncs(background_tasks: BackgroundTasks):
    """Retry synchronization of previously failed reports"""
    try:
        # Check connectivity
        connectivity_status = await connectivity_service.update_connectivity_status()
        if not connectivity_status.is_online:
            raise HTTPException(status_code=503, detail="No internet connection available")
        
        # Trigger retry in background
        background_tasks.add_task(sync_service.retry_failed_syncs)
        
        return SyncResult(
            success=True,
            synced_reports=0,
            failed_reports=0,
            details="Retry process started in background"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retry syncs: {str(e)}")

@router.get("/report/{offline_report_id}", response_model=OfflineReportResponse, summary="Get specific offline report")
async def get_offline_report(
    offline_report_id: int, 
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific offline report"""
    try:
        report = await offline_storage_service.get_offline_report(offline_report_id)
        
        if not report:
            raise HTTPException(status_code=404, detail="Offline report not found")
        
        # Check if user owns this report
        if report.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied to this report")
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get offline report: {str(e)}")

@router.delete("/cleanup", summary="Clean up old synced data")
async def cleanup_synced_data(older_than_days: int = 7):
    """Clean up successfully synced offline data older than specified days"""
    try:
        deleted_count = await offline_storage_service.cleanup_synced_data(older_than_days)
        return {
            "message": f"Cleaned up {deleted_count} old synced reports",
            "deleted_reports": deleted_count,
            "older_than_days": older_than_days
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup data: {str(e)}")

@router.get("/health", summary="Health check for offline sync system")
async def sync_health_check():
    """Health check endpoint for the offline sync system"""
    try:
        connectivity_status = connectivity_service.get_status()
        stats = await offline_storage_service.get_sync_statistics()
        
        health_status = {
            "status": "healthy",
            "connectivity": {
                "is_online": connectivity_status.is_online,
                "last_check": connectivity_status.last_check
            },
            "sync": {
                "is_syncing": sync_service.is_syncing,
                "pending_reports": stats.get("reports", {}).get("pending", 0),
                "failed_reports": stats.get("reports", {}).get("failed", 0)
            }
        }
        
        # Determine if system is unhealthy
        if stats.get("reports", {}).get("failed", 0) > 10:
            health_status["status"] = "degraded"
            health_status["warning"] = "High number of failed sync operations"
        
        return health_status
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }