"""create naica_demo schema with intake_requests

Revision ID: c4d5e6f7a8b9
Revises:
Create Date: 2026-05-02 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID, INET


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "naica_demo"


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")

    # Auto-update trigger function (schema-local; mirrors law_intel pattern)
    op.execute(f"""
        CREATE OR REPLACE FUNCTION {SCHEMA}.set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    # Sequence drives the public-facing REQ-###### identifier.
    op.execute(f"""
        CREATE SEQUENCE IF NOT EXISTS {SCHEMA}.intake_requests_seq START 100000
    """)

    op.create_table(
        "intake_requests",
        sa.Column("id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "request_id",
            sa.Text,
            nullable=False,
            unique=True,
            server_default=sa.text(
                f"'REQ-' || lpad(nextval('{SCHEMA}.intake_requests_seq')::text, 6, '0')"
            ),
        ),
        # request scope (multi-select)
        sa.Column("request_types", sa.ARRAY(sa.Text), nullable=False),
        sa.Column("requester", sa.Text, nullable=False),
        # consumer identity
        sa.Column("first_name", sa.Text, nullable=False),
        sa.Column("last_name", sa.Text, nullable=False),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("phone", sa.Text, nullable=True),
        sa.Column("state", sa.Text, nullable=False),
        sa.Column("relationship", sa.Text, nullable=True),
        # authorized agent (conditional)
        sa.Column("agent_name", sa.Text, nullable=True),
        sa.Column("agent_email", sa.Text, nullable=True),
        sa.Column("agent_org", sa.Text, nullable=True),
        sa.Column("authorization_confirmed", sa.Boolean, nullable=True),
        # help-find
        sa.Column("alternate_contacts", sa.Text, nullable=True),
        sa.Column("account_id", sa.Text, nullable=True),
        sa.Column("details", sa.Text, nullable=True),
        # response delivery
        sa.Column("delivery", sa.Text, nullable=False),
        sa.Column("mailing_address", sa.Text, nullable=True),
        # attestations
        sa.Column("attest_truthful", sa.Boolean, nullable=False),
        sa.Column("attest_understands", sa.Boolean, nullable=False),
        # lifecycle / SLA — populated by app or future pipeline
        sa.Column("status", sa.Text, nullable=False, server_default="received"),
        sa.Column("deadline_at", sa.DateTime(timezone=True), nullable=True),
        # forensic
        sa.Column("ip_address", INET, nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("raw_payload", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema=SCHEMA,
    )

    # Cast the email column to citext after creation (cleaner than the inline check above).
    op.execute(f"ALTER TABLE {SCHEMA}.intake_requests ALTER COLUMN email TYPE citext USING email::citext")
    op.execute(f"ALTER TABLE {SCHEMA}.intake_requests ALTER COLUMN agent_email TYPE citext USING agent_email::citext")

    # Check constraints
    op.execute(f"""
        ALTER TABLE {SCHEMA}.intake_requests
        ADD CONSTRAINT request_types_not_empty
        CHECK (array_length(request_types, 1) >= 1)
    """)
    op.execute(f"""
        ALTER TABLE {SCHEMA}.intake_requests
        ADD CONSTRAINT requester_valid
        CHECK (requester IN ('self','minor','agent'))
    """)
    op.execute(f"""
        ALTER TABLE {SCHEMA}.intake_requests
        ADD CONSTRAINT delivery_valid
        CHECK (delivery IN ('email','mail','phone'))
    """)
    op.execute(f"""
        ALTER TABLE {SCHEMA}.intake_requests
        ADD CONSTRAINT status_valid
        CHECK (status IN (
            'received','processing','pending_review',
            'approved','completed','denied','duplicate_closed'
        ))
    """)
    op.execute(f"""
        ALTER TABLE {SCHEMA}.intake_requests
        ADD CONSTRAINT mailing_address_required_when_mail
        CHECK (delivery <> 'mail' OR coalesce(mailing_address, '') <> '')
    """)
    op.execute(f"""
        ALTER TABLE {SCHEMA}.intake_requests
        ADD CONSTRAINT agent_fields_required_when_agent
        CHECK (
            requester <> 'agent' OR (
                coalesce(agent_name, '') <> ''
                AND coalesce(agent_email::text, '') <> ''
                AND authorization_confirmed = true
            )
        )
    """)

    # Indexes
    op.create_index("idx_intake_email", "intake_requests", ["email"], schema=SCHEMA)
    op.create_index("idx_intake_phone", "intake_requests", ["phone"], schema=SCHEMA)
    op.create_index("idx_intake_status", "intake_requests", ["status"], schema=SCHEMA)
    op.create_index("idx_intake_state", "intake_requests", ["state"], schema=SCHEMA)
    op.execute(
        f"CREATE INDEX idx_intake_created_at ON {SCHEMA}.intake_requests (created_at DESC)"
    )

    # Updated-at trigger
    op.execute(f"""
        CREATE TRIGGER intake_requests_updated_at
        BEFORE UPDATE ON {SCHEMA}.intake_requests
        FOR EACH ROW EXECUTE FUNCTION {SCHEMA}.set_updated_at()
    """)

    # RLS — public form posts with anon key, so anon can INSERT only
    op.execute(f"ALTER TABLE {SCHEMA}.intake_requests ENABLE ROW LEVEL SECURITY")
    op.execute(f"""
        CREATE POLICY "intake_anon_insert"
        ON {SCHEMA}.intake_requests
        FOR INSERT TO anon
        WITH CHECK (true)
    """)
    op.execute(f"""
        CREATE POLICY "intake_authenticated_read"
        ON {SCHEMA}.intake_requests
        FOR SELECT TO authenticated
        USING (true)
    """)

    # PostgREST exposure: grants on schema, table, and sequence
    op.execute(f"GRANT USAGE ON SCHEMA {SCHEMA} TO anon, authenticated, service_role")
    op.execute(f"GRANT INSERT ON {SCHEMA}.intake_requests TO anon")
    op.execute(f"GRANT SELECT, UPDATE ON {SCHEMA}.intake_requests TO authenticated, service_role")
    # anon needs USAGE on the sequence so the request_id default fires
    op.execute(f"GRANT USAGE, SELECT ON SEQUENCE {SCHEMA}.intake_requests_seq TO anon")
    # Allow anon to RETURN the inserted request_id (needed for .select() after insert)
    op.execute(f"GRANT SELECT (request_id, id) ON {SCHEMA}.intake_requests TO anon")


def downgrade() -> None:
    op.execute(f'DROP POLICY IF EXISTS "intake_anon_insert" ON {SCHEMA}.intake_requests')
    op.execute(f'DROP POLICY IF EXISTS "intake_authenticated_read" ON {SCHEMA}.intake_requests')
    op.execute(f"DROP TRIGGER IF EXISTS intake_requests_updated_at ON {SCHEMA}.intake_requests")
    op.drop_table("intake_requests", schema=SCHEMA)
    op.execute(f"DROP SEQUENCE IF EXISTS {SCHEMA}.intake_requests_seq")
    op.execute(f"DROP FUNCTION IF EXISTS {SCHEMA}.set_updated_at()")
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA}")
