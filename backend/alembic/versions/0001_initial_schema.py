"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-01 00:00:00.000000

Captures the schema as it existed before Alembic was introduced. On a DB
that already has these tables (the historical state), run:

    alembic stamp 0001_initial_schema

to record the migration as applied without re-running CREATE TABLE.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geography


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


HAZARD_TYPE_VALUES = (
    "tsunami", "high_waves", "coastal_flooding", "storm_surge",
    "rip_current", "coastal_erosion", "water_discoloration",
    "marine_debris", "other",
)
USER_ROLE_VALUES = ("citizen", "official", "authority", "analyst")
REPORT_STATUS_VALUES = ("under_verification", "verified", "rejected")
MEDIA_TYPE_VALUES = ("image", "video", "audio")
VERIFICATION_SOURCE_VALUES = ("nlp_pipeline", "weather_api", "peer_report")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    hazard_type = postgresql.ENUM(*HAZARD_TYPE_VALUES, name="hazard_type", create_type=False)
    user_role = postgresql.ENUM(*USER_ROLE_VALUES, name="user_role", create_type=False)
    report_status = postgresql.ENUM(*REPORT_STATUS_VALUES, name="report_status", create_type=False)
    media_type = postgresql.ENUM(*MEDIA_TYPE_VALUES, name="media_type", create_type=False)
    verification_source = postgresql.ENUM(
        *VERIFICATION_SOURCE_VALUES, name="verification_source", create_type=False
    )

    hazard_type.create(op.get_bind(), checkfirst=True)
    user_role.create(op.get_bind(), checkfirst=True)
    report_status.create(op.get_bind(), checkfirst=True)
    media_type.create(op.get_bind(), checkfirst=True)
    verification_source.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("bio", sa.String(500)),
        sa.Column("location", sa.String(255)),
        sa.Column("profile_picture", sa.String(500)),
        sa.Column("hashed_password", sa.String, nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.Column("latitude", sa.Float),
        sa.Column("longitude", sa.Float),
        sa.Column("location_updated_at", sa.TIMESTAMP(timezone=True)),
        sa.Column("reputation_score", sa.Integer, nullable=False, server_default="100"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("user_hazard_type", hazard_type, nullable=False),
        sa.Column(
            "user_location",
            Geography(geometry_type="POINT", srid=4326),
            nullable=False,
        ),
        sa.Column("user_description", sa.String),
        sa.Column("user_city", sa.String(255)),
        sa.Column(
            "status",
            report_status,
            nullable=False,
            server_default="under_verification",
        ),
        sa.Column("final_confidence_score", sa.Float, server_default="0.0"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
    )

    op.create_table(
        "media",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "report_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("reports.id"),
            nullable=False,
        ),
        sa.Column("file_url", sa.String, nullable=False),
        sa.Column("media_type", media_type, nullable=False),
        sa.Column("file_metadata", postgresql.JSONB),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
    )

    op.create_table(
        "verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "report_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("reports.id"),
            nullable=False,
        ),
        sa.Column("source", verification_source, nullable=False),
        sa.Column("result_data", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
    )

    op.create_table(
        "safety_circles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("is_safe", sa.Boolean, nullable=False),
        sa.Column("color", sa.String(7), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("safety_circles")
    op.drop_table("verifications")
    op.drop_table("media")
    op.drop_table("reports")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS verification_source;")
    op.execute("DROP TYPE IF EXISTS media_type;")
    op.execute("DROP TYPE IF EXISTS report_status;")
    op.execute("DROP TYPE IF EXISTS user_role;")
    op.execute("DROP TYPE IF EXISTS hazard_type;")
