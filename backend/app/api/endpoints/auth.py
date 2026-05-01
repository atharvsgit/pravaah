from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
import asyncio

from app.models.pydantic_models import UserCreate, UserRead, Token
from app.db.models import User
from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()

# Reduced timeout - if hashing takes longer, something is wrong
HASH_TIMEOUT = 5.0  # 5 seconds max for password operations

async def async_hash_password(password: str) -> str:
    """Run password hashing with timeout protection"""
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, hash_password, password),
            timeout=HASH_TIMEOUT
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password hashing timed out - server is overloaded"
        )

async def async_verify_password(plain_password: str, hashed_password: str) -> bool:
    """Run password verification with timeout protection"""
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, verify_password, plain_password, hashed_password),
            timeout=HASH_TIMEOUT
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password verification timed out - server is overloaded"
        )

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate, db: AsyncSession = Depends(get_db)
):
    print(f"📝 AuthService: Registering user with payload: {user_in.model_dump(exclude={'password'})}")
    
    try:
        # Additional password validation (Pydantic should catch most issues)
        if len(user_in.password.encode('utf-8')) > 72:
            print(f"🔐 Password for {user_in.email} is longer than 72 bytes, will be pre-hashed")
        
        # Check if user exists
        query = select(User).where(User.email == user_in.email)
        result = await asyncio.wait_for(db.execute(query), timeout=3.0)
        existing_user = result.scalars().first()
        
        if existing_user:
            print(f"❌ Registration failed: User {user_in.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists.",
            )

        print(f"🔐 Hashing password for {user_in.email}...")
        # Hash password asynchronously with timeout
        hashed_password = await async_hash_password(user_in.password)
        print(f"✓ Password hashed successfully")
        
        user_data = user_in.model_dump(exclude={"password"})
        
        new_user = User(
            id=uuid.uuid4(),
            **user_data,
            hashed_password=hashed_password
        )
        
        print(f"💾 Saving user to database...")
        db.add(new_user)
        await asyncio.wait_for(db.commit(), timeout=5.0)
        await asyncio.wait_for(db.refresh(new_user), timeout=2.0)
        
        print(f"✅ User {user_in.email} registered successfully with ID: {new_user.id}")
        return new_user
        
    except asyncio.TimeoutError as e:
        print(f"⏱️ Registration timeout for {user_in.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Registration timed out - please try again"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Registration error for {user_in.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    print(f"🔑 Login attempt for: {form_data.username}")
    
    try:
        query = select(User).where(User.email == form_data.username)
        result = await asyncio.wait_for(db.execute(query), timeout=3.0)
        user = result.scalars().first()

        if not user:
            print(f"❌ Login failed: User {form_data.username} not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"🔐 Verifying password for {form_data.username}...")
        # Verify password asynchronously with timeout
        password_valid = await async_verify_password(form_data.password, user.hashed_password)
        
        if not password_valid:
            print(f"❌ Login failed: Invalid password for {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            print(f"❌ Login failed: User {form_data.username} is inactive")
            raise HTTPException(status_code=400, detail="Inactive user")

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        
        print(f"✅ Login successful for {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except asyncio.TimeoutError:
        print(f"⏱️ Login timeout for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Login timed out - please try again"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error for {form_data.username}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )