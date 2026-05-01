"""
Smoke tests for password hashing + JWT. Pure crypto, no DB.
"""
from jose import jwt as jose_jwt

from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings


def test_hash_and_verify_roundtrip():
    hashed = hash_password("hunter2")
    assert hashed != "hunter2"
    assert verify_password("hunter2", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_long_password_handled():
    """Bcrypt has a 72-byte limit; the helper pre-hashes longer passwords."""
    long_password = "x" * 200
    hashed = hash_password(long_password)
    assert verify_password(long_password, hashed) is True


def test_access_token_decodes_with_secret():
    token = create_access_token(data={"sub": "user-id-123", "role": "citizen"})
    decoded = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "user-id-123"
    assert decoded["role"] == "citizen"
    assert "exp" in decoded
