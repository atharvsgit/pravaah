"""drop UserRole.authority enum value

Revision ID: 0002_drop_authority_role
Revises: 0001_initial_schema
Create Date: 2026-05-01 00:00:01.000000

The /api/authority router was removed and its dashboards consolidated into
/api/official. This migration:

  1. Reassigns any users still on the `authority` role to `official`.
  2. Recreates the `user_role` enum without the `authority` value.

Postgres doesn't support `ALTER TYPE ... DROP VALUE` directly, so we
rename-and-replace the type.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_drop_authority_role"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. move any authority-role users onto official before changing the type
    op.execute("UPDATE users SET role = 'official' WHERE role = 'authority';")

    # 2. swap the enum type: rename old, create new without 'authority',
    #    cast the column, drop old.
    op.execute("ALTER TYPE user_role RENAME TO user_role_old;")
    op.execute(
        "CREATE TYPE user_role AS ENUM ('citizen', 'official', 'analyst');"
    )
    op.execute(
        "ALTER TABLE users "
        "ALTER COLUMN role TYPE user_role USING role::text::user_role;"
    )
    op.execute("DROP TYPE user_role_old;")


def downgrade() -> None:
    op.execute("ALTER TYPE user_role RENAME TO user_role_old;")
    op.execute(
        "CREATE TYPE user_role AS ENUM "
        "('citizen', 'official', 'authority', 'analyst');"
    )
    op.execute(
        "ALTER TABLE users "
        "ALTER COLUMN role TYPE user_role USING role::text::user_role;"
    )
    op.execute("DROP TYPE user_role_old;")
