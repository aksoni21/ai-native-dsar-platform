"""seed REQ-015 (multi-jurisdictional Wilson) and REQ-016 (Two John Browns) pipeline requests

Revision ID: i5d6e7f8a9b0
Revises: h4c5d6e7f8a9
Create Date: 2026-05-03 14:00:00.000000

Adds two new pipeline-driving DSAR rows so /api/pipeline/run can execute them
end-to-end:

  REQ-015 — Thomas Wilson, deletion. Requester is a CALIFORNIA resident under
            CCPA; spouse Linda (still in VA, untouched) co-owns the household
            account, so per-record law application kicks in (CCPA full-delete
            on Thomas's sole-owner row, VCDPA-aware mask on shared rows).
            Because the existing source-system seed had Thomas in VA, this
            migration ALSO flips his contact / DWH / marketing / telematics
            state and address to CA so the live matcher can find him by
            name + state. Linda, the household account itself, and all of
            Thomas's VINs remain at the VA address — that's the cross-state
            joint-account shape we want to demo.

  REQ-016 — John Brown (TX), right-to-know. The seed already has both a TX
            John Brown (003C015) and an FL John Brown (003C016) — the
            namesake-collision pair. This migration just adds the intake row
            so the matcher can run against them.

Mirrors the pattern in h4c5d6e7f8a9_seed_dsar_pipeline_requests.py.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'i5d6e7f8a9b0'
down_revision: Union[str, Sequence[str], None] = 'h4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "naica_demo"

SEED_ROWS = [
    # (request_id, request_types, first, last, email, phone, state,
    #  status, deadline_at, created_at)
    ("REQ-015", ["deletion"],      "Thomas",  "Wilson",  "twils.com",       "415-555-1515", "CA",
     "pending_review", "2026-05-10T00:00:00Z", "2026-02-22T14:00:00Z"),
    ("REQ-016", ["right_to_know"], "John",    "Brown",   "john.brown1.com", "512-555-1717", "TX",
     "pending_review", "2026-05-15T00:00:00Z", "2026-02-25T11:00:00Z"),
]

# Thomas's source-system rows — needed so findPartyByName('Thomas','Wilson','CA')
# returns him on REQ-015. Linda and the household stay VA.
THOMAS_PARTY_ID = 'a1000010-0000-4000-a000-000000000010'
THOMAS_CONTACT_ID = '003C010'
THOMAS_SUBSCRIBER_ID = 10
THOMAS_VIN = '1HGBH41JXMN100010'
THOMAS_NEW_ADDRESS_FULL = '1247 Sansome St, San Francisco, CA 94111'
THOMAS_NEW_STREET = '1247 Sansome St'
THOMAS_NEW_CITY = 'San Francisco'
THOMAS_NEW_STATE = 'CA'

# Originals — for the downgrade path.
THOMAS_OLD_ADDRESS_FULL = '901 Cary St, Richmond, VA 23220'
THOMAS_OLD_STREET = '901 Cary St'
THOMAS_OLD_CITY = 'Richmond'
THOMAS_OLD_STATE = 'VA'


def upgrade() -> None:
    # ── intake_requests ─────────────────────────────────────────────────
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

    # ── Flip Thomas Wilson's residency to CA across source systems ─────
    # Linda, the Wilson household, the VINs, and the dealer interactions all
    # stay at the VA address — that's the multi-jurisdictional setup.
    op.execute(f"""
        UPDATE dwh.customer_main
           SET primary_state_cd = '{THOMAS_NEW_STATE}',
               primary_address_text = '{THOMAS_NEW_ADDRESS_FULL}'
         WHERE party_id = '{THOMAS_PARTY_ID}'
    """)
    op.execute(f"""
        UPDATE crm.contact
           SET mailing_state = '{THOMAS_NEW_STATE}',
               mailing_street = '{THOMAS_NEW_STREET}',
               mailing_city = '{THOMAS_NEW_CITY}'
         WHERE id = '{THOMAS_CONTACT_ID}'
    """)
    op.execute(f"""
        UPDATE marketing.subscriber
           SET state = '{THOMAS_NEW_STATE}'
         WHERE subscriber_id = {THOMAS_SUBSCRIBER_ID}
    """)
    op.execute(f"""
        UPDATE vehicle_telematics.vin_registration
           SET registration_state = '{THOMAS_NEW_STATE}'
         WHERE vin = '{THOMAS_VIN}'
           AND owner_email = 'twils.com'
    """)


def downgrade() -> None:
    # Reverse Thomas's residency flip.
    op.execute(f"""
        UPDATE vehicle_telematics.vin_registration
           SET registration_state = '{THOMAS_OLD_STATE}'
         WHERE vin = '{THOMAS_VIN}'
           AND owner_email = 'twils.com'
    """)
    op.execute(f"""
        UPDATE marketing.subscriber
           SET state = '{THOMAS_OLD_STATE}'
         WHERE subscriber_id = {THOMAS_SUBSCRIBER_ID}
    """)
    op.execute(f"""
        UPDATE crm.contact
           SET mailing_state = '{THOMAS_OLD_STATE}',
               mailing_street = '{THOMAS_OLD_STREET}',
               mailing_city = '{THOMAS_OLD_CITY}'
         WHERE id = '{THOMAS_CONTACT_ID}'
    """)
    op.execute(f"""
        UPDATE dwh.customer_main
           SET primary_state_cd = '{THOMAS_OLD_STATE}',
               primary_address_text = '{THOMAS_OLD_ADDRESS_FULL}'
         WHERE party_id = '{THOMAS_PARTY_ID}'
    """)

    ids = ",".join(f"'{row[0]}'" for row in SEED_ROWS)
    op.execute(f"DELETE FROM {SCHEMA}.intake_requests WHERE request_id IN ({ids})")
