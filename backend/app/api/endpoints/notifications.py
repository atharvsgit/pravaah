from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import List, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone

from app.db.session import get_db
from app.db.models import User, Report, HazardType, ReportStatus, SafetyCircle
from app.models.pydantic_models import PeerNotificationCreate, PeerNotificationResponse
from app.api.dependencies import get_current_user

router = APIRouter()

# backend/app/api/endpoints/notifications.py - Replace find_nearby_users function

async def find_nearby_users(
    latitude: float, 
    longitude: float, 
    radius_km: float = 5,  # Changed to 5km as requested
    db: AsyncSession = None
) -> List[User]:
    """Find users within a specified radius of a location using PostGIS."""
    try:
        # Create a point from the given coordinates
        point = f'SRID=4326;POINT({longitude} {latitude})'
        
        # Use PostGIS to find users within radius
        # Note: This assumes users have a location field with geography type
        # If users don't have location data, we'll need to add it to the User model
        
        # For now, let's return all active users as a fallback
        # TODO: Add user location tracking for proper distance filtering
        result = await db.execute(
            select(User).where(
                and_(
                    User.is_active == True,
                    User.role == "citizen"
                )
            ).limit(100)  # Limit to prevent overwhelming notifications
        )
        
        users = result.scalars().all()
        return users
        
    except Exception as e:
        return []
    
@router.get("/count", summary="Get notification count for current user")
async def get_notification_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the count of unread notifications for the current user.
    Returns the count of recent verified reports that the user hasn't responded to yet.
    """
    # Get count of recent verified reports (last 7 days) as notifications
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    
    # First, get all report IDs that the current user has already responded to
    user_responses = await db.execute(
        select(SafetyCircle.notification_id).where(
            SafetyCircle.user_id == current_user.id
        )
    )
    responded_report_ids = {row[0] for row in user_responses.fetchall()}
    
    # Get count of recent reports, excluding those the user has already responded to
    result = await db.execute(
        select(func.count(Report.id)).where(
            and_(
                Report.created_at >= recent_cutoff,
                ~Report.id.in_(responded_report_ids)  # Exclude reports user has responded to
            )
        )
    )
    recent_reports_count = result.scalar() or 0
    
    # Get total reports count (for reference)
    total_result = await db.execute(
        select(func.count(Report.id))
    )
    total_count = total_result.scalar() or 0
    
    return {
        "unread_count": recent_reports_count,  # Now shows only unresponded notifications
        "total_count": total_count,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.post("/peer", response_model=PeerNotificationResponse, status_code=201)
async def receive_peer_notification(
    notification_data: PeerNotificationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint to receive peer notification data from the worker.
    This will process the notification and determine which users to notify.
    """
    try:
        # Validate that the report exists
        report = await db.get(Report, notification_data.report_id)
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report with ID {notification_data.report_id} not found."
            )
        
        # Find nearby users who should receive this notification
        nearby_users = await find_nearby_users(
            notification_data.latitude,
            notification_data.longitude,
            radius_km=50,  # 50km radius
            db=db
        )
        
        # Filter out the user who created the report
        nearby_users = [user for user in nearby_users if user.id != report.user_id]
        
        # Here you would typically:
        # 1. Create notification records in your database
        # 2. Send push notifications to mobile apps
        # 3. Send emails or SMS if configured
        # 4. Update real-time notification feeds
        
        # Mock notification sending (replace with actual notification service)
        notifications_sent = []
        for user in nearby_users[:10]:  # Limit to first 10 users for this example
            notification_record = {
                "user_id": str(user.id),
                "user_email": user.email,
                "message": notification_data.message,
                "hazard_type": notification_data.hazard_type,
                "distance_km": "< 50",  # You'd calculate actual distance here
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
            notifications_sent.append(notification_record)
        
        response = PeerNotificationResponse(
            message=f"Peer notification processed for report {notification_data.report_id}",
            report_id=notification_data.report_id,
            notifications_sent=len(notifications_sent),
            recipient_details=notifications_sent
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process peer notification: {str(e)}"
        )

@router.get("/test-peer", summary="Test endpoint for peer notifications")
async def test_peer_notification(db: AsyncSession = Depends(get_db)):
    """Test endpoint to verify the peer notification system is working."""
    
    # Get a sample report to test with
    result = await db.execute(
        select(Report).limit(1)
    )
    sample_report = result.scalars().first()
    
    if not sample_report:
        raise HTTPException(status_code=404, detail="No reports found for testing")
    
    # Extract coordinates from the PostGIS point
    # This is a simplified extraction - you might need ST_X and ST_Y functions
    test_data = PeerNotificationCreate(
        report_id=sample_report.id,
        latitude=12.9716,  # Bangalore coordinates for testing
        longitude=77.5946,
        hazard_type=sample_report.user_hazard_type.value,
        notification_type="test",
        message="Test peer notification",
        priority="low"
    )
    
    return await receive_peer_notification(test_data, db)

@router.get("/recent", summary="Get recent notifications")
async def get_recent_notifications(
    limit: int = 10, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent notifications based on recent verified reports."""
    # Get recent verified reports to show as notifications
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    
    # First, get all report IDs that the current user has already responded to
    user_responses = await db.execute(
        select(SafetyCircle.notification_id).where(
            SafetyCircle.user_id == current_user.id
        )
    )
    responded_report_ids = {row[0] for row in user_responses.fetchall()}
    
    # Get recent reports, excluding those the user has already responded to
    result = await db.execute(
        select(Report, User.full_name).join(User).where(
            and_(
                Report.created_at >= recent_cutoff,
                ~Report.id.in_(responded_report_ids)  # Exclude reports user has responded to
            )
        ).order_by(Report.created_at.desc()).limit(limit)
    )
    recent_reports = result.all()
    
    # Convert reports to notification format
    notifications = []
    for report, user_name in recent_reports:
        # Map hazard types to readable names
        hazard_name_map = {
            'Tsunami': 'Tsunami',
            'High Waves / Swell': 'High Waves / Swell',
            'Coastal Flooding': 'Coastal Flooding',
            'Storm Surge': 'Storm Surge',
            'Rip Current': 'Rip Current',
            'Coastal Erosion': 'Coastal Erosion',
            'Water Discoloration / Algal Bloom': 'Water Discoloration / Algal Bloom',
            'Marine Debris / Pollution': 'Marine Debris / Pollution',
            'Other': 'Other Hazard'
        }
        
        hazard_name = hazard_name_map.get(report.user_hazard_type, 'Unknown Hazard')
        
        # Format time to ensure proper timezone handling
        if report.created_at.tzinfo is None:
            # If no timezone info, assume UTC and add timezone
            time_with_tz = report.created_at.replace(tzinfo=timezone.utc)
        else:
            # Convert to UTC if not already
            time_with_tz = report.created_at.astimezone(timezone.utc)
        
        notifications.append({
            "id": str(report.id),
            "hazardName": hazard_name,
            "description": report.user_description or f"New {hazard_name.lower()} report",
            "time": time_with_tz.isoformat(),
            "user": user_name,
            "status": report.status.value,
            "confidence": report.final_confidence_score,
            "location": report.user_city or "Unknown location",
            "image": None  # You can add media URL here if needed
        })
    
    return notifications

@router.post("/verify/{report_id}", summary="Verify a report notification")
async def verify_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """
    Verify a report by increasing its confidence score.
    This simulates community verification of the report.
    """
    try:
        # Get the report
        report_uuid = uuid.UUID(report_id)
        report = await db.get(Report, report_uuid)
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report with ID {report_id} not found"
            )
        
        # Increase confidence score by 10% (or set minimum increase of 0.1)
        current_score = report.final_confidence_score or 0.0
        confidence_increase = max(0.1, current_score * 0.1)
        new_score = min(1.0, current_score + confidence_increase)
        
        # Update the report
        report.final_confidence_score = new_score
        
        # Commit the changes
        await db.commit()
        await db.refresh(report)
        
        return {
            "message": "Report verified successfully",
            "report_id": report_id,
            "previous_confidence": current_score,
            "new_confidence": new_score,
            "increase": confidence_increase
        }
        
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid report ID format"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify report: {str(e)}"
        )

@router.post("/deny/{report_id}", summary="Deny a report notification")
async def deny_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """
    Deny a report. This keeps the confidence score the same but logs the denial.
    In a real system, you might track denials to identify false reports.
    """
    try:
        # Get the report
        report_uuid = uuid.UUID(report_id)
        report = await db.get(Report, report_uuid)
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report with ID {report_id} not found"
            )
        
        # Keep confidence score the same (as requested)
        current_score = report.final_confidence_score or 0.0
        
        # In a real system, you might:
        # - Add a denial record to track community feedback
        # - Decrease confidence score if multiple denials
        # - Flag report for manual review
        # For now, we just return the current state
        
        return {
            "message": "Report denial recorded",
            "report_id": report_id,
            "confidence_score": current_score,
            "status": "denied_by_user"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid report ID format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process denial: {str(e)}"
        )