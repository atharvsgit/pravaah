"""
Password hashing + JWT helpers.

Uses bcrypt directly instead of passlib because passlib's `safe_crypt`
unconditionally tries `from crypt import crypt`, which fails to import on
GitHub Actions ubuntu-latest with the actions/setup-python Python 3.11 build
(the `_crypt` C extension isn't bundled). Talking to bcrypt directly drops
that dependency chain entirely.

Hash format compatibility: passlib bcrypt produced `$2b$12$...` strings, which
is the standard bcrypt format that `bcrypt.checkpw` accepts. Existing rows in
the DB therefore continue to verify after this swap.
"""
from datetime import datetime, timedelta, timezone
import hashlib

import bcrypt
from jose import jwt

from app.core.config import settings

_BCRYPT_ROUNDS = 12
_BCRYPT_INPUT_LIMIT = 72  # bcrypt silently truncates beyond this many bytes


def _normalize_for_bcrypt(password: str) -> bytes:
    """
    bcrypt drops bytes past index 72, so pre-hash overlong passwords with
    SHA-256 (hex digest is 64 ASCII chars, comfortably under the limit).
    """
    raw = password.encode("utf-8")
    if len(raw) > _BCRYPT_INPUT_LIMIT:
        return hashlib.sha256(raw).hexdigest().encode("utf-8")
    return raw


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        _normalize_for_bcrypt(password),
        bcrypt.gensalt(rounds=_BCRYPT_ROUNDS),
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False

    # Legacy SHA-256 fallback format from earlier security.py revisions.
    if hashed_password.startswith("sha256$"):
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        _, salt, expected = parts
        actual = hashlib.sha256((plain_password + salt).encode("utf-8")).hexdigest()
        return actual == expected

    try:
        return bcrypt.checkpw(
            _normalize_for_bcrypt(plain_password),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
