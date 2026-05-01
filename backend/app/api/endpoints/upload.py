# app/api/endpoints/upload.py
from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Header
from fastapi.responses import JSONResponse
import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
import aiofiles
from datetime import datetime

router = APIRouter()

# Define upload directory (relative to the main.py location)
UPLOAD_DIR = Path("uploads/media")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif',
    # Videos
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp',
    # Audio
    '.wav', '.mp3', '.ogg', '.m4a', '.aac', '.flac'
}

# Maximum file size (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes

def get_file_extension(filename: str) -> str:
    """Get file extension in lowercase"""
    return Path(filename).suffix.lower()

def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return get_file_extension(filename) in ALLOWED_EXTENSIONS

def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename while preserving extension"""
    extension = get_file_extension(original_filename)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]  # Use first 8 chars of UUID
    # Create filename: timestamp_uuid_original.ext
    base_name = Path(original_filename).stem
    return f"{timestamp}_{unique_id}_{base_name}{extension}"

async def save_upload_file(upload_file: UploadFile, destination: Path) -> dict:
    """Save uploaded file asynchronously"""
    try:
        async with aiofiles.open(destination, 'wb') as f:
            content = await upload_file.read()
            await f.write(content)
        
        file_size = os.path.getsize(destination)
        return {
            "original_filename": upload_file.filename,
            "saved_filename": destination.name,
            "file_path": str(destination),
            "file_size": file_size,
            "content_type": upload_file.content_type
        }
    except Exception as e:
        # Clean up partial file
        if destination.exists():
            destination.unlink()
        raise e

@router.post("/image/upload")
async def upload_single_file(file: UploadFile = File(...)):
    """
    Upload a single media file (image, video, or audio)
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not is_allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Supported types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
        
        # Check file size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Generate unique filename
        unique_filename = generate_unique_filename(file.filename)
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        file_info = await save_upload_file(file, file_path)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "File uploaded successfully",
                "data": file_info
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.post("/reports/submit")
async def submit_report(
    user_hazard_type: str = Form(...),
    user_description: str = Form(...),
    latitude: Optional[str] = Header(None),
    longitude: Optional[str] = Header(None),
    media_files: List[UploadFile] = File(default=[])
):
    """
    Submit a complete report with multiple media files
    """
    try:
        uploaded_files = []
        
        # Process each media file
        for file in media_files:
            if not file.filename:
                continue
                
            if not is_allowed_file(file.filename):
                # Clean up already uploaded files
                for uploaded in uploaded_files:
                    Path(uploaded["file_path"]).unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400,
                    detail=f"File type not allowed: {file.filename}"
                )
            
            # Check file size
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                # Clean up already uploaded files
                for uploaded in uploaded_files:
                    Path(uploaded["file_path"]).unlink(missing_ok=True)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large: {file.filename}. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
                )
            
            # Reset file pointer
            await file.seek(0)
            
            # Generate unique filename and save
            unique_filename = generate_unique_filename(file.filename)
            file_path = UPLOAD_DIR / unique_filename
            
            file_info = await save_upload_file(file, file_path)
            uploaded_files.append(file_info)
        
        # Parse coordinates
        try:
            lat = float(latitude) if latitude else None
            lng = float(longitude) if longitude else None
        except (ValueError, TypeError):
            lat = lng = None
        
        # Create report data structure
        report_data = {
            "hazard_type": user_hazard_type,
            "description": user_description,
            "latitude": lat,
            "longitude": lng,
            "media_files": uploaded_files,
            "timestamp": datetime.now().isoformat(),
            "is_offline": False  # Can be determined based on your connectivity logic
        }
        
        # TODO: Save report_data to your database
        # You can integrate this with your existing database models
        print(f"Report submitted: {report_data}")
        
        # Generate report ID (you can replace this with your DB logic)
        report_id = str(uuid.uuid4())
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Report submitted successfully",
                "is_offline": False,
                "data": {
                    "report_id": report_id,
                    "files_uploaded": len(uploaded_files),
                    "total_size": sum(f["file_size"] for f in uploaded_files),
                    "hazard_type": user_hazard_type,
                    "location": {"latitude": lat, "longitude": lng} if lat and lng else None
                }
            }
        )
        
    except HTTPException:
        # Clean up uploaded files on HTTP errors
        for file_info in uploaded_files:
            Path(file_info["file_path"]).unlink(missing_ok=True)
        raise
    except Exception as e:
        # Clean up uploaded files on other errors
        for file_info in uploaded_files:
            Path(file_info["file_path"]).unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Error submitting report: {str(e)}")

@router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """
    Get information about an uploaded file
    """
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_stats = os.stat(file_path)
    return {
        "filename": filename,
        "size": file_stats.st_size,
        "created": datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
        "modified": datetime.fromtimestamp(file_stats.st_mtime).isoformat(),
        "url": f"/uploads/media/{filename}"
    }

@router.delete("/uploads/{filename}")
async def delete_uploaded_file(filename: str):
    """
    Delete an uploaded file
    """
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_path.unlink()
        return {"success": True, "message": f"File {filename} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

# Health check for upload service
@router.get("/upload/health")
async def upload_health_check():
    """Check if upload directory is accessible and has proper permissions"""
    try:
        # Test write permissions
        test_file = UPLOAD_DIR / "test_write.tmp"
        test_file.write_text("test")
        test_file.unlink()
        
        return {
            "status": "healthy",
            "upload_directory": str(UPLOAD_DIR),
            "directory_exists": UPLOAD_DIR.exists(),
            "write_permission": True,
            "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
            "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "upload_directory": str(UPLOAD_DIR),
            "directory_exists": UPLOAD_DIR.exists(),
            "write_permission": False,
            "error": str(e)
        }