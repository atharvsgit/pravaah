import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models import SafetyCircle, User
from app.models.pydantic_models import SafetyCircleCreate, SafetyCircleResponse
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=SafetyCircleResponse, status_code=201)
async def create_safety_circle(
    circle_data: SafetyCircleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new safety circle (green for safe, purple for not safe).
    The circle will automatically expire after 48 hours.
    """
    try:
        # Calculate expiration time (48 hours from now) - use timezone-aware datetime
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=48)
        
        # Create new safety circle
        new_circle = SafetyCircle(
            user_id=current_user.id,  # Use authenticated user's ID
            notification_id=circle_data.notification_id,
            latitude=circle_data.latitude,
            longitude=circle_data.longitude,
            is_safe=circle_data.is_safe,
            color=circle_data.color,
            expires_at=expires_at
        )
        
        db.add(new_circle)
        await db.commit()
        await db.refresh(new_circle)
        
        return SafetyCircleResponse(
            id=new_circle.id,
            user_id=new_circle.user_id,
            notification_id=new_circle.notification_id,
            latitude=new_circle.latitude,
            longitude=new_circle.longitude,
            is_safe=new_circle.is_safe,
            color=new_circle.color,
            created_at=new_circle.created_at,
            expires_at=new_circle.expires_at
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create safety circle: {str(e)}"
        )

@router.get("/active", response_model=list[SafetyCircleResponse])
async def get_active_safety_circles(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active safety circles (not expired).
    """
    try:
        current_time = datetime.now(timezone.utc)
        
        result = await db.execute(
            select(SafetyCircle)
            .where(SafetyCircle.expires_at > current_time)
            .order_by(SafetyCircle.created_at.desc())
        )
        circles = result.scalars().all()
        
        return [
            SafetyCircleResponse(
                id=circle.id,
                user_id=circle.user_id,
                notification_id=circle.notification_id,
                latitude=circle.latitude,
                longitude=circle.longitude,
                is_safe=circle.is_safe,
                color=circle.color,
                created_at=circle.created_at,
                expires_at=circle.expires_at
            )
            for circle in circles
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch safety circles: {str(e)}"
        )

@router.delete("/expired")
async def cleanup_expired_safety_circles(
    db: AsyncSession = Depends(get_db)
):
    """
    Clean up expired safety circles (older than 48 hours).
    This should be called by a background task periodically.
    """
    try:
        current_time = datetime.now(timezone.utc)
        
        result = await db.execute(
            select(SafetyCircle)
            .where(SafetyCircle.expires_at <= current_time)
        )
        expired_circles = result.scalars().all()
        
        count = len(expired_circles)
        
        for circle in expired_circles:
            await db.delete(circle)
        
        await db.commit()
        
        return {"message": f"Cleaned up {count} expired safety circles"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cleanup expired circles: {str(e)}"
        )