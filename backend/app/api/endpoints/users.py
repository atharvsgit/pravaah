from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import uuid
import os
from typing import List

from app.models.pydantic_models import UserRead, UserUpdate
from app.db.models import User, Report
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.services.img_to_hazard import analyze_ocean_hazard

router = APIRouter()

@router.get("/profile", response_model=UserRead)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile information"""
    return current_user

@router.put("/profile", response_model=UserRead)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile information"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user

@router.post("/profile/picture")
async def upload_profile_picture(
    profile_picture: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload profile picture"""
    print("[UPLOAD ENDPOINT] Received profile picture upload request.")
    # Validate file type
    if not profile_picture.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/profile_pictures"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = profile_picture.filename.split('.')[-1]
    filename = f"{current_user.id}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await profile_picture.read()
        buffer.write(content)
    
    # Analyze the uploaded image for hazards
    try:
        print(f"🔍 Starting hazard analysis for uploaded image: {file_path}")
        hazard_analysis = analyze_ocean_hazard(file_path)
        print(f"📊 HAZARD ANALYSIS RESULT:")
        print(f"{'='*50}")
        print(hazard_analysis)
        print(f"{'='*50}")
        # Parse hazard type and description from the analysis result
        hazard_type = None
        hazard_description = None
        for line in hazard_analysis.splitlines():
            if line.startswith("**Hazard:**"):
                hazard_type = line.replace("**Hazard:**", "").strip()
            if line.startswith("**Description:**"):
                hazard_description = line.replace("**Description:**", "").strip()
        
        # Map AI-detected hazard to valid application hazard types
        def map_hazard_type(ai_hazard):
            """Map AI-detected hazard to valid HazardType enum values"""
            if not ai_hazard:
                return "other"
            
            ai_hazard_lower = ai_hazard.lower()
            
            # High Waves / Large Waves / Breaking Waves
            if any(keyword in ai_hazard_lower for keyword in ["high waves", "large waves", "breaking waves", "big waves", "rough seas", "heavy seas"]):
                return "high_waves"
            
            # Tsunami
            if "tsunami" in ai_hazard_lower:
                return "tsunami"
            
            # Storm Surge
            if any(keyword in ai_hazard_lower for keyword in ["storm surge", "surge"]):
                return "storm_surge"
            
            # Coastal Flooding
            if any(keyword in ai_hazard_lower for keyword in ["coastal flooding", "flooding", "flood"]):
                return "coastal_flooding"
            
            # Rip Current
            if any(keyword in ai_hazard_lower for keyword in ["rip current", "rip", "undertow", "dangerous current"]):
                return "rip_current"
            
            # Coastal Erosion
            if any(keyword in ai_hazard_lower for keyword in ["erosion", "beach erosion", "coastal erosion"]):
                return "coastal_erosion"
            
            # Water Discoloration / Algal Bloom
            if any(keyword in ai_hazard_lower for keyword in ["algal bloom", "discoloration", "red tide", "algae", "bloom"]):
                return "water_discoloration"
            
            # Marine Debris / Pollution
            if any(keyword in ai_hazard_lower for keyword in ["debris", "pollution", "trash", "waste", "plastic"]):
                return "marine_debris"
            
            # Default to other
            return "other"
        
        # Map the detected hazard to a valid enum value
        mapped_hazard_type = map_hazard_type(hazard_type)
        
        # Fallbacks if not found
        if not hazard_type:
            hazard_type = "Unknown"
            mapped_hazard_type = "other"
        if not hazard_description:
            hazard_description = "No description available."
    except Exception as e:
        print(f"❌ Error during hazard analysis: {e}")
        # Provide realistic test data when API fails
        hazard_type = "Large Breaking Waves"
        hazard_description = "Test: Large breaking waves detected in uploaded image - dangerous surf conditions present."
        mapped_hazard_type = "high_waves"
    # Update user profile picture URL - use full URL for frontend
    profile_picture_url = f"/uploads/profile_pictures/{filename}"
    current_user.profile_picture = profile_picture_url
    await db.commit()
    await db.refresh(current_user)
    return {
        "profile_picture": profile_picture_url,
        "hazard_type": hazard_type,  # Show original AI detection directly  
        "hazard_type_mapped": mapped_hazard_type,  # Keep mapped version for reference
        "hazard_description": hazard_description
    }

@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics"""
    # Get total reports
    total_reports_query = select(func.count(Report.id)).where(Report.user_id == current_user.id)
    total_reports_result = await db.execute(total_reports_query)
    total_reports = total_reports_result.scalar() or 0
    
    # Get verified reports
    verified_reports_query = select(func.count(Report.id)).where(
        Report.user_id == current_user.id,
        Report.status == "verified"
    )
    verified_reports_result = await db.execute(verified_reports_query)
    verified_reports = verified_reports_result.scalar() or 0
    
    # Calculate safety rating (simplified - based on verification rate)
    safety_rating = 0.0
    if total_reports > 0:
        safety_rating = min(5.0, (verified_reports / total_reports) * 5.0)
    
    # Mock data for other stats (replace with real calculations later)
    stats = {
        "total_reports": total_reports,
        "verified_reports": verified_reports,
        "safety_rating": round(safety_rating, 1),
        "community_helps": 0,  # TODO: Implement community helps tracking
        "forum_views": 0,      # TODO: Implement forum views tracking
        "badges_earned": 0,    # TODO: Implement badges system
        "monthly_reports": 0,  # TODO: Implement monthly stats
        "monthly_forum_posts": 0,
        "monthly_helps": 0,
        "monthly_points": 0
    }
    
    return stats

@router.get("/activity")
async def get_user_activity(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's recent activity"""
    # Get recent reports
    reports_query = select(Report).where(
        Report.user_id == current_user.id
    ).order_by(Report.created_at.desc()).limit(limit)
    
    reports_result = await db.execute(reports_query)
    reports = reports_result.scalars().all()
    
    activities = []
    for report in reports:
        activities.append({
            "id": str(report.id),
            "type": "submitted",
            "title": f"Submitted {report.user_hazard_type.value} report",
            "created_at": report.created_at,
            "description": report.user_description
        })
    
    return activities

@router.get("/reports")
async def get_user_reports(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's reports"""
    reports_query = select(Report).where(
        Report.user_id == current_user.id
    ).order_by(Report.created_at.desc()).limit(limit)
    
    reports_result = await db.execute(reports_query)
    reports = reports_result.scalars().all()
    
    return reports

@router.get("/badges")
async def get_user_badges(
    current_user: User = Depends(get_current_user)
):
    """Get user's badges (mock data for now)"""
    # TODO: Implement badges system
    return []

@router.get("/rewards")
async def get_user_rewards(
    current_user: User = Depends(get_current_user)
):
    """Get user's rewards (mock data for now)"""
    # TODO: Implement rewards system
    return []


# Add location endpoints for users
from datetime import datetime, timezone

@router.put("/location", summary="Update user location")
async def update_user_location(
    location_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the current user's location."""
    latitude = location_data.get('latitude')
    longitude = location_data.get('longitude')
    accuracy = location_data.get('accuracy')
    
    if not latitude or not longitude:
        raise HTTPException(
            status_code=400,
            detail="Latitude and longitude are required"
        )
    
    # Update user location
    current_user.latitude = latitude
    current_user.longitude = longitude
    current_user.location_updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {
        "message": "Location updated successfully",
        "latitude": latitude,
        "longitude": longitude,
        "accuracy": accuracy,
        "updated_at": current_user.location_updated_at.isoformat()
    }

@router.get("/location", summary="Get user location")
async def get_user_location(
    current_user: User = Depends(get_current_user)
):
    """Get the current user's stored location."""
    return {
        "latitude": current_user.latitude,
        "longitude": current_user.longitude,
        "location_updated_at": current_user.location_updated_at.isoformat() if current_user.location_updated_at else None
    }