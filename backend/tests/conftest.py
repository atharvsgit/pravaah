"""
Set required env vars before any app imports so Settings() doesn't fail in CI.

We use direct assignment (not setdefault) so the test values always win, even
if the surrounding env happens to ship a half-set DATABASE_URL or similar.
"""
import os
import sys
from pathlib import Path

# Make `app.*` importable even when pytest's pythonpath option isn't picked up
# (older pytest, weird working-dir setups).
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/test"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ENVIRONMENT"] = "development"
