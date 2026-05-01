from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import JWTError, jwt
import uuid

from app.db.session import get_db
from app.db.models import User, UserRole
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    query = select(User).where(User.id == uuid.UUID(user_id))
    result = await db.execute(query)
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
        
    return user


# Role-based dependency utilities
async def get_current_citizen(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.citizen:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Citizen role required."
        )
    return current_user


async def get_current_official(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.official:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Official role required."
        )
    return current_user


async def get_current_analyst(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.analyst:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Analyst role required."
        )
    return current_user


async def get_current_official_or_analyst(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.official, UserRole.analyst]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Official or Analyst role required."
        )
    return current_user