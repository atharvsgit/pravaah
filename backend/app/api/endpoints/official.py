from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from typing import List, Optional
from uuid import UUID

from app.models.pydantic_models import UserRead
from app.db.models import User, Report, ReportStatus, HazardType
from app.db.session import get_db
from app.api.dependencies import get_current_official
from pydantic import BaseModel

router = APIRouter()

# Pydantic models for Official endpoints
class ReportVerificationRequest(BaseModel):
    status: ReportStatus
    notes: Optional[str] = None

class UnverifiedReportResponse(BaseModel):
    id: UUID
    user_id: UUID
    user_hazard_type: HazardType
    user_description: Optional[str]
    user_city: Optional[str]
    final_confidence_score: float
    created_at: str
    user: UserRead

class VerificationResponse(BaseModel):
    message: str
    report_id: UUID
    new_status: ReportStatus

class HotspotData(BaseModel):
    latitude: float
    longitude: float
    report_count: int
    hazard_types: List[str]
    severity_score: float

@router.get("/reports/unverified", response_model=List[UnverifiedReportResponse])
async def get_unverified_reports(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    hazard_type: Optional[HazardType] = None,
    current_user: User = Depends(get_current_official),
    db: AsyncSession = Depends(get_db)
):
    """Get pending reports that need verification by officials, including auto-rejected reports that can be overridden."""
    
    # Include both under_verification and rejected reports for manual review
    query = select(Report).where(
        Report.status.in_([ReportStatus.under_verification, ReportStatus.rejected])
    )
    
    if hazard_type:
        query = query.where(Report.user_hazard_type == hazard_type)
    
    query = query.offset(offset).limit(limit).order_by(Report.created_at.desc())
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    # Convert to response format
    response_reports = []
    for report in reports:
        # Get user info
        user_query = select(User).where(User.id == report.user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalars().first()
        
        response_reports.append(UnverifiedReportResponse(
            id=report.id,
            user_id=report.user_id,
            user_hazard_type=report.user_hazard_type,
            user_description=report.user_description,
            user_city=report.user_city,
            final_confidence_score=report.final_confidence_score,
            created_at=report.created_at.isoformat(),
            user=UserRead.model_validate(user)
        ))
    
    return response_reports

@router.post("/reports/{report_id}/verify", response_model=VerificationResponse)
async def verify_report(
    report_id: UUID,
    verification: ReportVerificationRequest,
    current_user: User = Depends(get_current_official),
    db: AsyncSession = Depends(get_db)
):
    """Update report verification status (Verified/Rejected/Action Taken) for reports in Medium/Low confidence range."""
    
    print(f"[DEBUG] Verification request received: report_id={report_id}, status={verification.status}, user={current_user.email}")
    
    # Get the report
    query = select(Report).where(Report.id == report_id)
    result = await db.execute(query)
    report = result.scalars().first()
    
    if not report:
        print(f"[DEBUG] Report {report_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    print(f"[DEBUG] Report found: status={report.status}, confidence={report.final_confidence_score}")
    
    # Check if report is in the correct state for manual verification
    # Allow verification for:
    # 1. Reports under_verification (normal manual review)
    # 2. Reports rejected (official override capability)
    if report.status not in [ReportStatus.under_verification, ReportStatus.rejected]:
        print(f"[DEBUG] Report status check failed: current status is {report.status}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report is already {report.status.value}. Only reports under verification or rejected reports can be manually verified."
        )
    
    # If report is rejected, allow officials to override
    if report.status == ReportStatus.rejected:
        print(f"[DEBUG] Official override: allowing verification of rejected report {report_id}")
    
    # Check confidence level - only allow manual verification for Medium/Low confidence (40-80%)
    # BUT allow override of rejected reports regardless of confidence
    confidence_score = report.final_confidence_score
    
    # TEMPORARY: Allow verification of reports with 0.0 confidence for testing
    # TODO: Remove this once the verification pipeline is fully working
    if confidence_score == 0.0:
        print(f"[DEBUG] TEMPORARY: Allowing verification of report with 0.0 confidence for testing")
        # Continue with verification instead of raising an error
    elif report.status == ReportStatus.rejected:
        print(f"[DEBUG] Official override: allowing verification of rejected report regardless of confidence ({confidence_score})")
        # Allow officials to override any rejected report
    elif confidence_score < 0.4:
        print(f"[DEBUG] Confidence too low: {confidence_score}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report has Very Low confidence ({confidence_score:.2f}). It should be automatically rejected."
        )
    elif confidence_score >= 0.8:
        print(f"[DEBUG] Confidence too high: {confidence_score}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report has High confidence ({confidence_score:.2f}). It should be automatically verified."
        )
    
    # Confidence is in range 0.4-0.8 (Medium/Low) - allow manual verification
    print(f"[Official Verification] Official {current_user.email} manually verifying report {report_id} "
          f"with confidence {confidence_score:.2f} ({_get_confidence_level(confidence_score)})")
    
    # Update the report status
    old_status = report.status
    report.status = verification.status
    
    print(f"[DEBUG] Updating report status from {old_status} to {verification.status}")
    
    # TODO: Add verification notes to a separate table if needed
    # For now, we'll just update the status
    
    try:
        await db.commit()
        await db.refresh(report)
        print(f"[DEBUG] Report {report_id} successfully updated to {verification.status}")
    except Exception as e:
        print(f"[DEBUG] Database error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    
    return VerificationResponse(
        message=f"Report {report_id} manually {verification.status.value} by official (confidence: {confidence_score:.2f})",
        report_id=report_id,
        new_status=verification.status
    )

def _get_confidence_level(score: float) -> str:
    """Convert numeric score to confidence level."""
    if score >= 0.8:
        return "High"
    elif score >= 0.6:
        return "Medium"
    elif score >= 0.4:
        return "Low"
    else:
        return "Very Low"

@router.get("/map/assets")
async def get_map_assets(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_official),
    db: AsyncSession = Depends(get_db)
):
    """Fetch assets like hospitals/shelters near a location."""
    
    # TODO: Implement asset fetching from a dedicated assets table
    # For now, return mock data
    mock_assets = [
        {
            "id": "hospital_1",
            "name": "City General Hospital",
            "type": "hospital",
            "latitude": latitude + 0.01,
            "longitude": longitude + 0.01,
            "capacity": 200,
            "contact": "+1-555-0123"
        },
        {
            "id": "shelter_1", 
            "name": "Emergency Shelter Center",
            "type": "shelter",
            "latitude": latitude - 0.01,
            "longitude": longitude - 0.01,
            "capacity": 500,
            "contact": "+1-555-0456"
        }
    ]
    
    return {
        "assets": mock_assets,
        "search_center": {"latitude": latitude, "longitude": longitude},
        "radius_km": radius_km
    }

@router.post("/incidents/chat")
async def create_incident_chat(
    message: str,
    incident_id: Optional[UUID] = None,
    priority: str = "normal",
    current_user: User = Depends(get_current_official),
    db: AsyncSession = Depends(get_db)
):
    """Role-gated chat system for incident coordination."""
    
    # TODO: Implement proper incident chat system
    # For now, return acknowledgment
    
    return {
        "message": "Chat message sent",
        "sender_id": current_user.id,
        "sender_name": current_user.full_name,
        "incident_id": incident_id,
        "priority": priority,
        "timestamp": "2024-01-01T00:00:00Z"  # Replace with actual timestamp
    }

@router.get("/reports/all", response_model=List[UnverifiedReportResponse])
async def get_all_reports(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status_filter: Optional[ReportStatus] = None,
    hazard_type: Optional[HazardType] = None,
    current_user: User = Depends(get_current_official),
    db: AsyncSession = Depends(get_db)
):
    """Get all reports with optional filtering by status and hazard type."""
    
    query = select(Report)
    
    if status_filter:
        query = query.where(Report.status == status_filter)
    
    if hazard_type:
        query = query.where(Report.user_hazard_type == hazard_type)
    
    query = query.offset(offset).limit(limit).order_by(Report.created_at.desc())
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    # Convert to response format
    response_reports = []
    for report in reports:
        # Get user info
        user_query = select(User).where(User.id == report.user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalars().first()
        
        response_reports.append(UnverifiedReportResponse(
            id=report.id,
            user_id=report.user_id,
            user_hazard_type=report.user_hazard_type,
            user_description=report.user_description,
            user_city=report.user_city,
            final_confidence_score=report.final_confidence_score,
            created_at=report.created_at.isoformat(),
            user=UserRead.model_validate(user)
        ))
    
    return response_reports

@router.get("/alerts/hotspots", response_model=List[HotspotData])
async def get_hotspots(
    hours_back: int = Query(24, ge=1, le=168),  # Last 24 hours by default, max 1 week
    min_reports: int = Query(3, ge=2, le=20),   # Minimum reports to be considered a hotspot
    current_user: User = Depends(get_current_official),
    db: AsyncSession = Depends(get_db)
):
    """High-density hotspot detection for emergency response."""
    
    # TODO: Implement proper geospatial clustering for hotspot detection
    # This would require PostGIS functions like ST_ClusterDBSCAN
    # For now, return mock hotspot data
    
    mock_hotspots = [
        HotspotData(
            latitude=40.7128,
            longitude=-74.0060,
            report_count=5,
            hazard_types=["High Waves / Swell", "Storm Surge"],
            severity_score=7.5
        ),
        HotspotData(
            latitude=34.0522,
            longitude=-118.2437,
            report_count=3,
            hazard_types=["Coastal Flooding"],
            severity_score=6.2
        )
    ]
    
    return mock_hotspots
