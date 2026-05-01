# backend/app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

# This is the model for reading/returning a report from the API
class Report(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    hazard_type: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class User(UserBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    # We remove the 'reports' field for now to break the circular import
    # reports: List["Report"] = [] 

    class Config:
        from_attributes = True