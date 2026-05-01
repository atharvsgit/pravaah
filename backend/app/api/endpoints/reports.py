from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Depends, Header
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from uuid import uuid4
import uuid
import tempfile
import shutil
from pathlib import Path

from app.db.models import User, HazardType, Report, Media
from app.db.session import get_db
from app.models.pydantic_models import ReportSubmitResponse
from app.models.offline_models import OfflineReportCreate
from app.services.rabbitmq_service import rabbitmq_service
from app.services.s3_service import s3_service
from app.services.connectivity_service import connectivity_service
from app.services.offline_storage_service import offline_storage_service
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/submit", response_model=ReportSubmitResponse, status_code=202, summary="Submit a new Hazard Report (with offline support)")
async def submit_hazard_report(
    latitude: float = Header(..., description="Auto-detected latitude from device GPS"),
    longitude: float = Header(..., description="Auto-detected longitude from device GPS"),
    user_hazard_type: HazardType = Form(..., description="The type of hazard observed"),
    user_description: Optional[str] = Form(None, description="A description of the hazard"),
    media_files: List[UploadFile] = File([], description="Optional list of image, video, or audio files"),
    current_user: User = Depends(get_current_user)
):
    report_id = uuid4()
    
    # Check connectivity status
    connectivity_status = await connectivity_service.update_connectivity_status()
    
    if not connectivity_status.is_online:
        # Handle offline submission
        return await _submit_report_offline(
            report_id, latitude, longitude, user_hazard_type, 
            user_description, media_files, current_user
        )
    
    # Handle online submission (existing logic)
    try:
        media_payloads = []
        for file in media_files:
            content_type = file.content_type
            if content_type.startswith("image/"): media_type = "image"
            elif content_type.startswith("video/"): media_type = "video"
            elif content_type.startswith("audio/"): media_type = "audio"
            else: continue
                
            # Call the S3 service to upload the file and get a REAL URL
            real_file_url = s3_service.upload_file(file, media_type, report_id)
            
            # We only add the file to the message if the upload was successful
            if real_file_url:
                media_payloads.append({
                    "file_url": real_file_url,
                    "media_type": media_type
                })
        
        message_body = {
            "report_id": str(report_id),
            "user_id": str(current_user.id),
            "report_data": {
                "user_hazard_type": user_hazard_type.value,
                "user_description": user_description,
                "latitude": latitude,
                "longitude": longitude
            },
            "media_files": media_payloads # This now contains REAL S3 URLs
        }

        await rabbitmq_service.publish_message("report_processing_queue", message_body)
        return {"message": "Hazard report has been accepted for processing.", "report_id": report_id}
        
    except Exception as e:
        # If online submission fails, try offline fallback
        return await _submit_report_offline(
            report_id, latitude, longitude, user_hazard_type, 
            user_description, media_files, current_user
        )


async def _submit_report_offline(
    report_id: uuid.UUID,
    latitude: float,
    longitude: float,
    user_hazard_type: HazardType,
    user_description: Optional[str],
    media_files: List[UploadFile],
    current_user: User
) -> dict:
    """Handle offline report submission"""
    try:
        # Create offline report data
        offline_report_data = OfflineReportCreate(
            user_id=str(current_user.id),
            hazard_type=user_hazard_type.value,
            latitude=latitude,
            longitude=longitude,
            description=user_description,
            city=None  # Could be determined from coordinates later
        )
        
        # Save media files temporarily
        temp_media_files = []
        for file in media_files:
            content_type = file.content_type
            if content_type.startswith("image/"): media_type = "image"
            elif content_type.startswith("video/"): media_type = "video" 
            elif content_type.startswith("audio/"): media_type = "audio"
            else: continue
            
            # Save file to temporary location
            temp_dir = Path(tempfile.gettempdir()) / "offline_reports"
            temp_dir.mkdir(exist_ok=True)
            
            temp_file_path = temp_dir / f"{report_id}_{file.filename}"
            
            with open(temp_file_path, "wb") as temp_file:
                shutil.copyfileobj(file.file, temp_file)
            
            temp_media_files.append((
                str(temp_file_path),
                media_type,
                {"original_filename": file.filename, "content_type": content_type}
            ))
        
        # Store report offline
        offline_report = await offline_storage_service.store_report_offline(
            offline_report_data, temp_media_files
        )
        
        return {
            "message": "Report saved offline. Will sync when connection is restored.",
            "report_id": str(report_id),
            "offline_id": offline_report.id,
            "is_offline": True
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save report offline: {str(e)}"
        )


@router.get("/hotspots", summary="List report hotspots with coordinates and confidence")
async def list_hotspots(db: AsyncSession = Depends(get_db)):
    """Return an array of hotspots with latitude, longitude, and final_confidence_score.
    If score is null, default to 0.0. Only includes reports that have a location.
    """
    # Extract WKT and parse without requiring Shapely
    result = await db.execute(
        select(
            Report.id,
            Report.final_confidence_score,
            Report.status,
            Report.user_hazard_type,
            Report.created_at,
            func.ST_AsText(Report.user_location)
        )
    )
    rows = result.all()

    hotspots: List[dict] = []
    for (rid, conf, status, hazard, created_at, wkt) in rows:
        if not wkt:
            continue
        # Normalize values
        conf_val = float(conf or 0.0)
        status_str = status.value if hasattr(status, 'value') else str(status)
        # Reject only when confidence below threshold (0.35)
        if conf_val < 0.35:
            continue
        # WKT format: 'POINT(lon lat)'
        try:
            coords = wkt.strip().replace("POINT(", "").replace(")", "").split()
            if len(coords) != 2:
                continue
            lng = float(coords[0])
            lat = float(coords[1])
        except Exception:
            continue
        hotspots.append({
            "report_id": str(rid),
            "latitude": lat,
            "longitude": lng,
            "confidence": conf_val,
            "status": status_str,
            "hazard_type": hazard.value if hasattr(hazard, 'value') else str(hazard),
            "created_at": created_at.isoformat() if created_at else None
        })

    return {"items": hotspots, "count": len(hotspots)}


@router.get("/recent", summary="List recent reports with basic info")
async def list_recent_reports(limit: int = 9, db: AsyncSession = Depends(get_db)):
    """Return most recent reports with minimal fields for the dashboard.
    Includes: id, hazard_type, status, created_at, user_description, user_city, thumbnail_url, user_name.
    """
    # Clamp limit to a reasonable range
    safe_limit = max(1, min(limit, 24))

    result = await db.execute(
        select(Report, User.full_name).join(User, Report.user_id == User.id)
        .order_by(Report.created_at.desc()).limit(safe_limit)
    )
    reports_with_users = result.all()

    items: List[dict] = []
    for r, user_name in reports_with_users:
        thumb_url = None
        try:
            # Fetch one media file (first by created_at) for thumbnail if available
            m_res = await db.execute(
                select(Media.file_url).where(Media.report_id == r.id).order_by(Media.created_at.asc()).limit(1)
            )
            mrow = m_res.first()
            if mrow:
                thumb_url = mrow[0]
        except Exception:
            thumb_url = None

        items.append({
            "id": str(r.id),
            "hazard_type": r.user_hazard_type.value if hasattr(r.user_hazard_type, 'value') else str(r.user_hazard_type),
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "user_description": r.user_description,
            "user_city": r.user_city,
            "user_name": user_name,
            "thumbnail_url": thumb_url,
        })

    return {"items": items, "count": len(items)}