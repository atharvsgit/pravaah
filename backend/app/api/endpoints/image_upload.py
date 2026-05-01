from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import os
from app.api.dependencies import get_current_user
from app.db.models import User
from app.db.session import get_db

router = APIRouter()

@router.post("/upload")
async def upload_image_evidence(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload image evidence for reports"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/media"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Return file URL - use full URL for frontend
    image_url = f"/uploads/media/{filename}"
    
    return {"image_url": image_url, "filename": filename}