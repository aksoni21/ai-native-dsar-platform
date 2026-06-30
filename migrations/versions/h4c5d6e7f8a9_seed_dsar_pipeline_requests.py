"""seed the 5 demo DSAR pipeline requests into intake_requests

Revision ID: h4c5d6e7f8a9
Revises: g3b4c5d6e7f8
Create Date: 2026-05-03 12:30:00.000000

Mirrors the 5 active scenarios from src/data/requests.json (REQ-001/002/003/
009/010) so the /api/pipeline/run endpoint can drive real work against
Supabase. The remaining JSON rows stay where they are — they are tab metadata,
not pipeline rows.

Pipeline request_type vocabulary is used (`right_to_know`, `deletion`,
`opt_out`, `correction`) so existing UI helpers like requestTypeLabel() and
compliance_rules.json keep working unchanged.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'h4c5d6e7f8a9'
down_revision: Union[str, Sequence[str], None] = 'g3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "naica_demo"

SEED_ROWS = [
    # (request_id, request_types, first, last, email, phone, state,
    #  status, deadline_at, created_at)
    ("REQ-001", ["right_to_know"], "Maria",   "Chen",      "maria.chen.com",       "415-555-0101", "CA",
     "completed",      "2026-03-15T00:00:00Z", "2026-01-10T09:00:00Z"),
    ("REQ-002", ["deletion"],      "Sofia",   "Rodriguez", "sofia.rodriguez.com",  "571-555-0202", "VA",
     "pending_review", "2026-04-05T00:00:00Z", "2026-01-20T14:30:00Z"),
    ("REQ-003", ["opt_out"],       "James",   "Williams",  "jwilliams.com",      "860-555-0303", "CT",
     "completed",      "2026-03-20T00:00:00Z", "2026-01-25T11:00:00Z"),
    ("REQ-009", ["right_to_know"], "Karen",   "Lee",       "karen.lee.com",        "203-555-0909", "CT",
     "completed",      "2026-03-30T00:00:00Z", "2026-02-15T11:45:00Z"),
    ("REQ-010", ["deletion"],      "David",   "Brown",     "david.brown.com",    "972-555-1010", "TX",
     "pending_review", "2026-04-30T00:00:00Z", "2026-02-18T10:20:00Z"),
]


def upgrade() -> None:
    for (request_id, types, first, last, email, phone, state,
         status, deadline, created) in SEED_ROWS:
        op.execute(f"""
            INSERT INTO {SCHEMA}.intake_requests (
                request_id, request_types, requester,
                first_name, last_name, email, phone, state,
                delivery, attest_truthful, attest_understands,
                status, deadline_at, created_at
            ) VALUES (
                '{request_id}',
                ARRAY[{",".join(f"'{t}'" for t in types)}]::text[],
                'self',
                '{first}', '{last}', '{email}'::citext, '{phone}', '{state}',
                'email', true, true,
                '{status}', '{deadline}'::timestamptz, '{created}'::timestamptz
            )
            ON CONFLICT (request_id) DO NOTHING
        """)


def downgrade() -> None:
    ids = ",".join(f"'{row[0]}'" for row in SEED_ROWS)
    op.execute(f"DELETE FROM {SCHEMA}.intake_requests WHERE request_id IN ({ids})")
