"""create source-system schemas for DSAR scanning

Revision ID: e1f2a3b4c5d6
Revises: c4d5e6f7a8b9
Create Date: 2026-05-02 18:00:00.000000

Creates five vendor-agnostic schemas that model the heterogeneous source
systems a DSAR pipeline must scan in an automotive OEM:

  dwh                  cloud data warehouse + golden record (customer_main)
  crm                  customer relationship management
  marketing            ESP + loyalty + audience platform
  dealer_dms           dealer management system (service / parts / repair)
  vehicle_telematics   connected-car platform

The schemas use intentionally different naming conventions (snake_case in
all of them, but with system-flavored suffixes — _cd / _ts / _nm in dwh,
external_customer_id-style FKs in marketing, VIN-centric tables in
dealer_dms / vehicle_telematics) so the matching/identity-resolution
engine has realistic heterogeneity to work with.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID


revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMAS = ['dwh', 'crm', 'marketing', 'dealer_dms', 'vehicle_telematics']


def upgrade() -> None:
    for s in SCHEMAS:
        op.execute(f"CREATE SCHEMA IF NOT EXISTS {s}")

    # ─────────────────────────────────────────────────────────────────
    # dwh — data warehouse (Snowflake-style: stg + marts + golden record)
    # ─────────────────────────────────────────────────────────────────
    op.create_table(
        "stg_customer_unified",
        sa.Column("stg_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("source_system", sa.Text, nullable=False),  # 'crm' | 'marketing' | 'dealer_dms' | 'vehicle_telematics'
        sa.Column("source_id", sa.Text, nullable=False),
        sa.Column("first_nm", sa.Text),
        sa.Column("last_nm", sa.Text),
        sa.Column("email_addr", sa.Text),
        sa.Column("phone_e164", sa.Text),
        sa.Column("state_cd", sa.Text),
        sa.Column("raw_payload", JSONB),
        sa.Column("ingested_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="dwh",
    )

    op.create_table(
        "customer_main",
        sa.Column("party_id", UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_nm", sa.Text),
        sa.Column("last_nm", sa.Text),
        sa.Column("previous_last_nm", sa.Text),  # maiden name, surfaced from sources
        sa.Column("full_legal_nm", sa.Text),
        sa.Column("birth_dt", sa.Date),
        sa.Column("primary_email_addr", sa.Text),
        sa.Column("primary_phone_e164", sa.Text),
        sa.Column("primary_state_cd", sa.Text),
        sa.Column("primary_address_text", sa.Text),
        sa.Column("household_key", UUID),  # groups records that share an address
        sa.Column("consent_marketing", sa.Boolean),
        sa.Column("consent_telematics", sa.Boolean),
        # Maps system-specific IDs back to this golden record:
        # {"crm": "003abc...", "marketing": 12345, "dealer_dms_email": "...", ...}
        sa.Column("source_system_keys", JSONB, nullable=False, server_default="{}"),
        sa.Column("first_seen_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_updated_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="dwh",
    )
    op.create_index("idx_customer_main_email", "customer_main", ["primary_email_addr"], schema="dwh")
    op.create_index("idx_customer_main_phone", "customer_main", ["primary_phone_e164"], schema="dwh")
    op.create_index("idx_customer_main_lastnm", "customer_main", ["last_nm"], schema="dwh")
    op.create_index("idx_customer_main_household", "customer_main", ["household_key"], schema="dwh")

    op.create_table(
        "inferred_attributes",
        sa.Column("party_id", UUID, primary_key=True),
        # Coded fields — the kind that need decoding via cipher_legend
        sa.Column("income_band_cd", sa.Text),       # 'A' .. 'H'
        sa.Column("marketing_seg_cd", sa.Text),     # e.g. 'URB-P', 'FAM-S'
        sa.Column("vehicle_segment_cd", sa.Text),   # 'SED-C', 'SUV-M'
        sa.Column("age_range_cd", sa.Text),         # '4' = 35-44
        sa.Column("education_cd", sa.Text),         # '4' = Bachelor
        sa.Column("occupation_cd", sa.Text),
        # ML outputs
        sa.Column("churn_score", sa.Numeric(5, 4)),
        sa.Column("ltv_estimate_usd", sa.Numeric(12, 2)),
        sa.Column("propensity_to_buy_score", sa.Numeric(5, 4)),
        sa.Column("inferred_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("model_version", sa.Text),
        sa.ForeignKeyConstraint(["party_id"], ["dwh.customer_main.party_id"], ondelete="CASCADE"),
        schema="dwh",
    )

    op.create_table(
        "fct_purchase",
        sa.Column("purchase_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("party_id", UUID),
        sa.Column("vin", sa.Text),
        sa.Column("vehicle_year", sa.Integer),
        sa.Column("vehicle_make", sa.Text),
        sa.Column("vehicle_model", sa.Text),
        sa.Column("purchase_dt", sa.Date),
        sa.Column("dealer_id", sa.Text),
        sa.Column("financing_flag", sa.Boolean),
        sa.Column("purchase_price_usd", sa.Numeric(12, 2)),
        sa.ForeignKeyConstraint(["party_id"], ["dwh.customer_main.party_id"], ondelete="SET NULL"),
        schema="dwh",
    )
    op.create_index("idx_fct_purchase_party", "fct_purchase", ["party_id"], schema="dwh")
    op.create_index("idx_fct_purchase_vin", "fct_purchase", ["vin"], schema="dwh")

    op.create_table(
        "fct_service_event",
        sa.Column("service_event_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("party_id", UUID),
        sa.Column("vin", sa.Text),
        sa.Column("service_dt", sa.Date),
        sa.Column("dealer_id", sa.Text),
        sa.Column("service_type_cd", sa.Text),  # 'OC' (oil change), 'RC' (recall), 'WAR' (warranty), 'COL' (collision)
        sa.Column("cost_usd", sa.Numeric(10, 2)),
        sa.Column("warranty_covered_flag", sa.Boolean),
        sa.ForeignKeyConstraint(["party_id"], ["dwh.customer_main.party_id"], ondelete="SET NULL"),
        schema="dwh",
    )
    op.create_index("idx_fct_service_party", "fct_service_event", ["party_id"], schema="dwh")
    op.create_index("idx_fct_service_vin", "fct_service_event", ["vin"], schema="dwh")

    # ─────────────────────────────────────────────────────────────────
    # crm — customer relationship management (Salesforce-shaped)
    # ─────────────────────────────────────────────────────────────────
    op.create_table(
        "account",
        sa.Column("id", sa.Text, primary_key=True),  # '001...' style
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("account_type", sa.Text),  # 'Household' | 'Individual' | 'Dealer'
        sa.Column("parent_id", sa.Text),
        sa.Column("billing_state", sa.Text),
        sa.Column("billing_street", sa.Text),
        sa.Column("billing_city", sa.Text),
        sa.Column("created_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_modified_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="crm",
    )

    op.create_table(
        "contact",
        sa.Column("id", sa.Text, primary_key=True),  # '003...' style
        sa.Column("account_id", sa.Text),
        sa.Column("first_name", sa.Text, nullable=False),
        sa.Column("last_name", sa.Text, nullable=False),
        sa.Column("email", sa.Text),
        sa.Column("phone", sa.Text),  # often raw / unformatted
        sa.Column("mailing_state", sa.Text),
        sa.Column("mailing_street", sa.Text),
        sa.Column("mailing_city", sa.Text),
        sa.Column("birthdate", sa.Date),
        sa.Column("previous_last_name", sa.Text),  # maiden name custom-field
        sa.Column("marketing_opt_in", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("do_not_call", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_modified_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["account_id"], ["crm.account.id"], ondelete="SET NULL"),
        schema="crm",
    )
    op.create_index("idx_crm_contact_email", "contact", ["email"], schema="crm")
    op.create_index("idx_crm_contact_phone", "contact", ["phone"], schema="crm")
    op.create_index("idx_crm_contact_lastname", "contact", ["last_name"], schema="crm")
    op.create_index("idx_crm_contact_account", "contact", ["account_id"], schema="crm")

    op.create_table(
        "support_case",
        sa.Column("id", sa.Text, primary_key=True),  # '500...' style
        sa.Column("contact_id", sa.Text),
        sa.Column("account_id", sa.Text),
        sa.Column("subject", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("status", sa.Text, nullable=False, server_default="New"),
        sa.Column("origin", sa.Text),  # 'Email' | 'Phone' | 'Web' | 'Dealer'
        sa.Column("priority", sa.Text),
        sa.Column("vin", sa.Text),
        sa.Column("created_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("closed_date", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["contact_id"], ["crm.contact.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["account_id"], ["crm.account.id"], ondelete="SET NULL"),
        schema="crm",
    )
    op.create_index("idx_crm_case_contact", "support_case", ["contact_id"], schema="crm")

    op.create_table(
        "opportunity",
        sa.Column("id", sa.Text, primary_key=True),  # '006...' style
        sa.Column("account_id", sa.Text),
        sa.Column("contact_id", sa.Text),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("stage_name", sa.Text, nullable=False),
        sa.Column("amount", sa.Numeric(12, 2)),
        sa.Column("close_date", sa.Date),
        sa.Column("vehicle_interest", sa.Text),
        sa.Column("dealer_id", sa.Text),
        sa.Column("created_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["account_id"], ["crm.account.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["contact_id"], ["crm.contact.id"], ondelete="SET NULL"),
        schema="crm",
    )

    # ─────────────────────────────────────────────────────────────────
    # marketing — ESP / audience / loyalty (vendor-agnostic, own IDs)
    # ─────────────────────────────────────────────────────────────────
    op.create_table(
        "subscriber",
        sa.Column("subscriber_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("first_name", sa.Text),
        sa.Column("last_name", sa.Text),
        sa.Column("phone", sa.Text),
        sa.Column("state", sa.Text),
        # Often null — many subscribers exist only here, never matched back to CRM:
        sa.Column("external_customer_id", sa.Text),
        sa.Column("source_channel", sa.Text),  # 'web_signup' | 'dealer_event' | 'crm_sync' | 'import'
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("status", sa.Text, nullable=False, server_default="active"),
        # 'active' | 'unsubscribed' | 'suppressed' | 'pending_confirmation'
        schema="marketing",
    )
    op.create_index("idx_marketing_subscriber_email", "subscriber", ["email"], schema="marketing")
    op.create_index("idx_marketing_subscriber_phone", "subscriber", ["phone"], schema="marketing")
    op.create_index("idx_marketing_subscriber_xid", "subscriber", ["external_customer_id"], schema="marketing")

    op.create_table(
        "subscription_preference",
        sa.Column("subscriber_id", sa.BigInteger, nullable=False),
        sa.Column("channel", sa.Text, nullable=False),    # 'email' | 'sms' | 'push'
        sa.Column("category", sa.Text, nullable=False),   # 'marketing' | 'service_reminder' | 'recall' | 'newsletter'
        sa.Column("opted_in", sa.Boolean, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("subscriber_id", "channel", "category"),
        sa.ForeignKeyConstraint(["subscriber_id"], ["marketing.subscriber.subscriber_id"], ondelete="CASCADE"),
        schema="marketing",
    )

    op.create_table(
        "send_history",
        sa.Column("send_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("subscriber_id", sa.BigInteger, nullable=False),
        sa.Column("campaign_id", sa.Text),
        sa.Column("template_name", sa.Text),
        sa.Column("channel", sa.Text, nullable=False),  # 'email' | 'sms'
        sa.Column("subject", sa.Text),
        sa.Column("send_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["subscriber_id"], ["marketing.subscriber.subscriber_id"], ondelete="CASCADE"),
        schema="marketing",
    )
    op.create_index("idx_marketing_send_subscriber", "send_history", ["subscriber_id"], schema="marketing")
    op.create_index("idx_marketing_send_ts", "send_history", ["send_ts"], schema="marketing")

    op.create_table(
        "engagement_event",
        sa.Column("event_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("send_id", sa.BigInteger),
        sa.Column("subscriber_id", sa.BigInteger),
        sa.Column("event_type", sa.Text, nullable=False),  # 'open' | 'click' | 'bounce' | 'complaint'
        sa.Column("event_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("metadata", JSONB, server_default="{}"),
        sa.ForeignKeyConstraint(["send_id"], ["marketing.send_history.send_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscriber_id"], ["marketing.subscriber.subscriber_id"], ondelete="CASCADE"),
        schema="marketing",
    )
    op.create_index("idx_marketing_engage_subscriber", "engagement_event", ["subscriber_id"], schema="marketing")

    op.create_table(
        "suppression",
        sa.Column("subscriber_id", sa.BigInteger, primary_key=True),
        sa.Column("reason", sa.Text, nullable=False),
        # 'unsubscribed' | 'hard_bounce' | 'spam_complaint' | 'gdpr_request' | 'ccpa_opt_out'
        sa.Column("suppressed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        # CAN-SPAM evidence retention — we have to KEEP a suppression record even after a deletion request,
        # to prove we honored the unsubscribe. This date is when we can finally purge.
        sa.Column("retention_required_until", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["subscriber_id"], ["marketing.subscriber.subscriber_id"], ondelete="CASCADE"),
        schema="marketing",
    )

    op.create_table(
        "loyalty_member",
        sa.Column("member_id", sa.Text, primary_key=True),  # public-facing ID like 'NX-...'
        sa.Column("subscriber_id", sa.BigInteger),
        sa.Column("enrollment_ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("current_tier", sa.Text, nullable=False, server_default="bronze"),
        # 'bronze' | 'silver' | 'gold' | 'platinum'
        sa.Column("points_balance", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("lifetime_points_earned", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("status", sa.Text, nullable=False, server_default="active"),
        sa.ForeignKeyConstraint(["subscriber_id"], ["marketing.subscriber.subscriber_id"], ondelete="SET NULL"),
        schema="marketing",
    )
    op.create_index("idx_marketing_loyalty_subscriber", "loyalty_member", ["subscriber_id"], schema="marketing")

    # ─────────────────────────────────────────────────────────────────
    # dealer_dms — Dealer Management System (CDK / Reynolds-shaped)
    # ─────────────────────────────────────────────────────────────────
    op.create_table(
        "service_record",
        sa.Column("service_id", sa.Text, primary_key=True),  # 'DMS-...'
        sa.Column("vin", sa.Text, nullable=False),
        # DMS often has only contact details, no real customer ID — common identity-resolution pain:
        sa.Column("customer_email", sa.Text),
        sa.Column("customer_phone", sa.Text),
        sa.Column("customer_first_name", sa.Text),
        sa.Column("customer_last_name", sa.Text),
        sa.Column("service_dt", sa.Date, nullable=False),
        sa.Column("dealer_id", sa.Text),
        sa.Column("mileage", sa.Integer),
        sa.Column("service_type", sa.Text),  # 'oil_change' | 'recall' | 'warranty' | 'collision' | 'general'
        sa.Column("notes", sa.Text),
        sa.Column("warranty_covered", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        schema="dealer_dms",
    )
    op.create_index("idx_dms_service_vin", "service_record", ["vin"], schema="dealer_dms")
    op.create_index("idx_dms_service_email", "service_record", ["customer_email"], schema="dealer_dms")
    op.create_index("idx_dms_service_phone", "service_record", ["customer_phone"], schema="dealer_dms")
    op.create_index("idx_dms_service_lastname", "service_record", ["customer_last_name"], schema="dealer_dms")

    op.create_table(
        "repair_invoice",
        sa.Column("invoice_id", sa.Text, primary_key=True),
        sa.Column("service_id", sa.Text, nullable=False),
        sa.Column("vin", sa.Text, nullable=False),
        sa.Column("line_items", JSONB, server_default="[]"),
        sa.Column("parts_total_usd", sa.Numeric(10, 2)),
        sa.Column("labor_total_usd", sa.Numeric(10, 2)),
        sa.Column("total_usd", sa.Numeric(10, 2)),
        sa.Column("paid", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("invoice_dt", sa.Date, nullable=False),
        sa.ForeignKeyConstraint(["service_id"], ["dealer_dms.service_record.service_id"], ondelete="CASCADE"),
        schema="dealer_dms",
    )
    op.create_index("idx_dms_invoice_service", "repair_invoice", ["service_id"], schema="dealer_dms")
    op.create_index("idx_dms_invoice_vin", "repair_invoice", ["vin"], schema="dealer_dms")

    # ─────────────────────────────────────────────────────────────────
    # vehicle_telematics — connected-car platform
    # ─────────────────────────────────────────────────────────────────
    op.create_table(
        "vin_registration",
        sa.Column("vin", sa.Text, primary_key=True),
        sa.Column("owner_email", sa.Text),
        sa.Column("owner_first_name", sa.Text),
        sa.Column("owner_last_name", sa.Text),
        sa.Column("owner_phone", sa.Text),
        sa.Column("registration_state", sa.Text),
        sa.Column("vehicle_year", sa.Integer),
        sa.Column("vehicle_make", sa.Text),
        sa.Column("vehicle_model", sa.Text),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("consent_telematics", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consent_location", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consent_data_sharing", sa.Boolean, nullable=False, server_default="false"),
        schema="vehicle_telematics",
    )
    op.create_index("idx_tel_vin_email", "vin_registration", ["owner_email"], schema="vehicle_telematics")
    op.create_index("idx_tel_vin_phone", "vin_registration", ["owner_phone"], schema="vehicle_telematics")
    op.create_index("idx_tel_vin_lastname", "vin_registration", ["owner_last_name"], schema="vehicle_telematics")

    op.create_table(
        "trip_event",
        sa.Column("trip_id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("vin", sa.Text, nullable=False),
        sa.Column("trip_start_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("trip_end_ts", sa.DateTime(timezone=True)),
        sa.Column("start_lat", sa.Numeric(9, 6)),
        sa.Column("start_lon", sa.Numeric(9, 6)),
        sa.Column("end_lat", sa.Numeric(9, 6)),
        sa.Column("end_lon", sa.Numeric(9, 6)),
        sa.Column("distance_miles", sa.Numeric(7, 2)),
        sa.Column("max_speed_mph", sa.Integer),
        sa.Column("hard_brake_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("geofence_alerts", JSONB, server_default="[]"),
        sa.ForeignKeyConstraint(["vin"], ["vehicle_telematics.vin_registration.vin"], ondelete="CASCADE"),
        schema="vehicle_telematics",
    )
    op.create_index("idx_tel_trip_vin", "trip_event", ["vin"], schema="vehicle_telematics")
    op.create_index("idx_tel_trip_start", "trip_event", ["trip_start_ts"], schema="vehicle_telematics")


def downgrade() -> None:
    for s in reversed(SCHEMAS):
        op.execute(f"DROP SCHEMA IF EXISTS {s} CASCADE")
