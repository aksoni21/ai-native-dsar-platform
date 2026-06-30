"""add duplicate_of_id to intake_requests

Revision ID: g3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-05-03 12:00:00.000000

The dedup step of the DSAR pipeline needs a column to record when a request
is a follow-up of another. Nullable text — same shape as `request_id`.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'g3b4c5d6e7f8'
down_revision: Union[str, Sequence[str], None] = 'f2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "naica_demo"


def upgrade() -> None:
    op.execute(
        f"ALTER TABLE {SCHEMA}.intake_requests "
        f"ADD COLUMN IF NOT EXISTS duplicate_of_id TEXT"
    )
    op.execute(
        f"CREATE INDEX IF NOT EXISTS idx_intake_duplicate_of "
        f"ON {SCHEMA}.intake_requests (duplicate_of_id) "
        f"WHERE duplicate_of_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute(f"DROP INDEX IF EXISTS {SCHEMA}.idx_intake_duplicate_of")
    op.execute(f"ALTER TABLE {SCHEMA}.intake_requests DROP COLUMN IF EXISTS duplicate_of_id")
