"""
Pydantic models for offline sync functionality
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class SyncStatus(str, Enum):
    PENDING = "pending"
    SYNCED = "synced" 
    FAILED = "failed"
    SYNCING = "syncing"

class OfflineReportCreate(BaseModel):
    user_id: str
    hazard_type: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    city: Optional[str] = None

class OfflineReportResponse(BaseModel):
    id: int
    user_id: str
    hazard_type: str
    latitude: float
    longitude: float
    description: Optional[str]
    city: Optional[str]
    created_at: datetime
    sync_status: SyncStatus
    sync_attempts: int
    last_sync_attempt: Optional[datetime]
    postgres_id: Optional[str]
    error_message: Optional[str]

class OfflineMediaCreate(BaseModel):
    offline_report_id: int
    file_path: str
    media_type: str
    file_metadata: Optional[str] = None

class OfflineMediaResponse(BaseModel):
    id: int
    offline_report_id: int
    file_path: str
    media_type: str
    file_metadata: Optional[str]
    created_at: datetime
    sync_status: SyncStatus
    postgres_id: Optional[str]

class SyncStatusResponse(BaseModel):
    last_sync_attempt: Optional[datetime]
    last_successful_sync: Optional[datetime]
    pending_reports_count: int
    failed_reports_count: int
    is_online: bool
    updated_at: datetime

class SyncResult(BaseModel):
    success: bool
    synced_reports: int
    failed_reports: int
    errors: List[str] = []
    details: Optional[str] = None

class ConnectivityStatus(BaseModel):
    is_online: bool
    last_check: datetime
    connection_type: Optional[str] = None