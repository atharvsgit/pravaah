from pydantic import BaseModel, EmailStr, Field, validator
from uuid import UUID
from datetime import datetime

from app.db.models import UserRole, HazardType

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128, description="Password must be 8-128 characters long")
    role: UserRole
    
    @validator('password')
    def validate_password(cls, v):
        # Check password length in bytes (bcrypt limit is 72 bytes)
        if len(v.encode('utf-8')) > 72:
            # For very long passwords, we'll pre-hash them in security.py
            # But warn users about the practical limit
            if len(v) > 128:
                raise ValueError('Password is too long. Please use a password with fewer than 128 characters.')
        
        # Basic password strength checks
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
            
        return v

class UserRead(UserBase):
    id: UUID
    role: UserRole
    is_active: bool
    bio: str | None = None
    location: str | None = None
    profile_picture: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    location: str | None = None
    profile_picture: str | None = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ReportCreate(BaseModel):
    user_hazard_type: HazardType
    user_description: str | None = None
    latitude: float
    longitude: float

class ReportSubmitResponse(BaseModel):
    message: str
    report_id: UUID

class VerificationCreate(BaseModel):
    """
    A generic model for submitting verification results from any source.
    """
    report_id: UUID
    result_data: dict = Field(..., example={"condition": "Rain", "temp_celsius": 25.5})




# Add these classes to your existing backend/app/models/pydantic_models.py file

from typing import List, Dict, Any

class PeerNotificationCreate(BaseModel):
    report_id: UUID
    latitude: float
    longitude: float
    hazard_type: str
    notification_type: str = "new_report_alert"
    message: str
    priority: str = "normal"

class PeerNotificationResponse(BaseModel):
    message: str
    report_id: UUID
    notifications_sent: int
    recipient_details: List[Dict[str, Any]]


# Safety Circle models for community notifications

class SafetyCircleCreate(BaseModel):
    notification_id: UUID
    latitude: float
    longitude: float
    is_safe: bool
    color: str

class SafetyCircleResponse(BaseModel):
    id: UUID
    user_id: UUID
    notification_id: UUID
    latitude: float
    longitude: float
    is_safe: bool
    color: str
    created_at: datetime
    expires_at: datetime