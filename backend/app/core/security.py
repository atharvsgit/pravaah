from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import hashlib

from app.core.config import settings

# Simplified password context to avoid bcrypt compatibility issues
try:
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=12,
        bcrypt__ident="2b"
    )
    BCRYPT_AVAILABLE = True
except Exception as e:
    print(f"Bcrypt initialization failed: {e}")
    # Fallback to PBKDF2 if bcrypt fails
    pwd_context = CryptContext(
        schemes=["pbkdf2_sha256"],
        deprecated="auto"
    )
    BCRYPT_AVAILABLE = False

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Supports both bcrypt and fallback hashing methods.
    """
    try:
        # Check if it's a fallback SHA-256 hash first
        if hashed_password.startswith('sha256$'):
            # Parse the fallback hash format: sha256$salt$hash
            parts = hashed_password.split('$')
            if len(parts) == 3:
                salt = parts[1]
                expected_hash = parts[2]
                password_with_salt = plain_password + salt
                actual_hash = hashlib.sha256(password_with_salt.encode('utf-8')).hexdigest()
                return actual_hash == expected_hash
            return False
        
        # For bcrypt hashes, handle passwords longer than 72 bytes the same way as hashing
        password_to_verify = plain_password
        password_bytes = plain_password.encode('utf-8')
        
        if len(password_bytes) > 72:
            # Pre-hash with SHA-256 to match what was done during hashing
            password_to_verify = hashlib.sha256(password_bytes).hexdigest()
        
        return pwd_context.verify(password_to_verify, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def hash_password(password: str) -> str:
    """
    Hash a password using the available method (bcrypt or fallback).
    Automatically handles bcrypt's 72-byte limit by pre-hashing long passwords.
    """
    try:
        # Handle bcrypt's 72-byte limit by pre-hashing long passwords
        password_to_hash = password
        password_bytes = password.encode('utf-8')
        
        if len(password_bytes) > 72:
            print(f"Password too long ({len(password_bytes)} bytes), pre-hashing with SHA-256...")
            # Pre-hash with SHA-256 to fit within bcrypt's 72-byte limit
            password_to_hash = hashlib.sha256(password_bytes).hexdigest()
        
        return pwd_context.hash(password_to_hash)
    except Exception as e:
        print(f"Password hashing error: {e}")
        # Fallback to SHA-256 with salt
        import secrets
        salt = secrets.token_hex(16)
        password_with_salt = password + salt
        hashed = hashlib.sha256(password_with_salt.encode('utf-8')).hexdigest()
        return f"sha256${salt}${hashed}"

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt

