import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, text, ForeignKey, Float,
    TIMESTAMP
)
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from geoalchemy2 import Geography
from sqlalchemy.orm import relationship
import uuid

# Import the declarative base
from app.db.base import Base

# --- Enums for controlled vocabularies ---
class HazardType(str, enum.Enum):
    tsunami = "Tsunami"
    high_waves = "High Waves / Swell"
    coastal_flooding = "Coastal Flooding"
    storm_surge = "Storm Surge"
    rip_current = "Rip Current"
    coastal_erosion = "Coastal Erosion"
    water_discoloration = "Water Discoloration / Algal Bloom"
    marine_debris = "Marine Debris / Pollution"
    other = "Other"

class UserRole(str, enum.Enum):
    citizen = "citizen"
    official = "official"
    analyst = "analyst"

class ReportStatus(str, enum.Enum):
    under_verification = "under_verification"
    verified = "verified"
    rejected = "rejected"

class ReportUrgency(str, enum.Enum):
    immediate = "immediate"
    moderate = "moderate"
    low = "low"
    rumor = "rumor"

class ReportSentiment(str, enum.Enum):
    panic = "panic"
    calm = "calm"
    confusion = "confusion"

class MediaType(str, enum.Enum):
    image = "image"
    video = "video"
    audio = "audio"

class VerificationSource(str, enum.Enum):
    nlp_pipeline = "nlp_pipeline"
    weather_api = "weather_api"
    peer_report = "peer_report"

# --- Main Tables ---

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    bio = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(ENUM(UserRole, name="user_role"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("TIMEZONE('utc', now())"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True) 
    location_updated_at = Column(TIMESTAMP(timezone=True), nullable=True)
    reputation_score = Column(Integer, default=100, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    reports = relationship("Report", back_populates="user")
    safety_circles = relationship("SafetyCircle", back_populates="user")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    user_hazard_type = Column(ENUM(HazardType, name="hazard_type"), nullable=False)
    user_location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    user_description = Column(String)
    user_city = Column(String(255), nullable=True)
    
    status = Column(ENUM(ReportStatus, name="report_status"), nullable=False, default=ReportStatus.under_verification)
    final_confidence_score = Column(Float, default=0.0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("TIMEZONE('utc', now())"), nullable=False)
    
    user = relationship("User", back_populates="reports")
    media_files = relationship("Media", back_populates="report", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="report", cascade="all, delete-orphan")

class Media(Base):
    __tablename__ = "media"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    
    file_url = Column(String, nullable=False)
    media_type = Column(ENUM(MediaType, name="media_type"), nullable=False)
    
    file_metadata = Column(JSONB, nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("TIMEZONE('utc', now())"), nullable=False)
    
    report = relationship("Report", back_populates="media_files")

class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"), nullable=False)
    
    source = Column(ENUM(VerificationSource, name="verification_source"), nullable=False)
    result_data = Column(JSONB, nullable=False)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("TIMEZONE('utc', now())"), nullable=False)
    
    report = relationship("Report", back_populates="verifications")


# Safety circles for community notifications and map display

class SafetyCircle(Base):
    __tablename__ = "safety_circles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notification_id = Column(UUID(as_uuid=True), nullable=False)  # Reference to the notification
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_safe = Column(Boolean, nullable=False)  # True for green (safe), False for purple (not safe)
    color = Column(String(7), nullable=False)  # Hex color code
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("TIMEZONE('utc', now())"), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)  # 48 hours from creation
    
    user = relationship("User", back_populates="safety_circles")

