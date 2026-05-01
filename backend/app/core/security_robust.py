"""
Alternative security implementation with multiple fallback options
"""
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import hashlib
import secrets
import base64

from app.core.config import settings

def _create_robust_pwd_context():
    """Create password context with multiple fallback options."""
    try:
        # Try passlib with bcrypt
        from passlib.context import CryptContext
        try:
            return CryptContext(
                schemes=["bcrypt"],
                deprecated="auto",
                bcrypt__rounds=12,
                bcrypt__ident="2b"
            )
        except Exception:
            try:
                return CryptContext(schemes=["bcrypt"], deprecated="auto")
            except Exception:
                return CryptContext(schemes=["bcrypt"])
    except Exception:
        # If passlib fails completely, return None to use fallback
        return None

# Try to create password context
pwd_context = _create_robust_pwd_context()

def _fallback_hash_password(password: str) -> str:
    """Fallback password hashing using PBKDF2 with SHA-256."""
    # Generate a random salt
    salt = secrets.token_bytes(32)
    # Hash the password with PBKDF2
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    # Combine salt and hash, then encode as base64
    combined = salt + pwd_hash
    return base64.b64encode(combined).decode('ascii')

def _fallback_verify_password(plain_password: str, hashed_password: str) -> bool:
    """Fallback password verification using PBKDF2 with SHA-256."""
    try:
        # Decode the stored password
        combined = base64.b64decode(hashed_password.encode('ascii'))
        salt = combined[:32]
        stored_hash = combined[32:]
        
        # Hash the provided password with the same salt
        pwd_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        
        # Compare hashes
        return secrets.compare_digest(stored_hash, pwd_hash)
    except Exception:
        return False

def hash_password(password: str) -> str:
    """
    Hash a password using the best available method.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    if pwd_context is not None:
        # Try bcrypt first
        try:
            # Handle bcrypt's 72-byte limit
            password_bytes = password.encode('utf-8')
            if len(password_bytes) > 72:
                # Use SHA-256 pre-hashing for long passwords
                password = hashlib.sha256(password_bytes).hexdigest()
            
            return "bcrypt:" + pwd_context.hash(password)
        except Exception as e:
            print(f"bcrypt failed, using fallback: {e}")
    
    # Use fallback method
    return "pbkdf2:" + _fallback_hash_password(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash using the appropriate method.
    """
    if not plain_password or not hashed_password:
        return False
    
    # Check which method was used to hash the password
    if hashed_password.startswith("bcrypt:"):
        actual_hash = hashed_password[7:]  # Remove "bcrypt:" prefix
        if pwd_context is not None:
            try:
                # Handle bcrypt's 72-byte limit
                password_bytes = plain_password.encode('utf-8')
                if len(password_bytes) > 72:
                    plain_password = hashlib.sha256(password_bytes).hexdigest()
                
                return pwd_context.verify(plain_password, actual_hash)
            except Exception:
                return False
        return False
    elif hashed_password.startswith("pbkdf2:"):
        actual_hash = hashed_password[7:]  # Remove "pbkdf2:" prefix
        return _fallback_verify_password(plain_password, actual_hash)
    else:
        # Legacy format, try both methods
        if pwd_context is not None:
            try:
                password_bytes = plain_password.encode('utf-8')
                if len(password_bytes) > 72:
                    plain_password = hashlib.sha256(password_bytes).hexdigest()
                return pwd_context.verify(plain_password, hashed_password)
            except Exception:
                pass
        
        # Try fallback method
        return _fallback_verify_password(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt