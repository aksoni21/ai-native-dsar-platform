"""seed demo data — 20 synthetic people threaded across source systems

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-05-02 18:30:00.000000

Each person below is engineered to demo a specific real-world matching or
disposition edge case the DSAR pipeline must handle:

  01 Maria Chen          — clean cross-system match (baseline)
  02 James Williams      — clean cross-system match
  03 Karen Lee           — clean match + rich coded inferred_attributes
  04 Robert Johnson      — clean match
  05 Patricia Davis      — multi-purchase history, household head
  06 Sofia Chen          — maiden-name change (was Rodriguez)
  07 John Smith          — email change (employer switch)
  08 Emily Nakamura      — telematics-only (sold the car, dropped from CRM)
  09 Aisha Patel         — marketing-only (signed up at dealer event, no purchase)
  10 Thomas Wilson       — household head; spouse Linda is on same account
  11 Linda Wilson        — Thomas's spouse; deletion of Thomas must not affect Linda
  12 Michael Torres      — appears as "Mike" in DMS (nickname / fuzzy name)
  13 Angela Martinez     — multi-VIN owner (her car + teen's car)
  14 Jamie O'Brien       — same phone, four different formats across systems
  15 John Brown (TX)     — namesake collision
  16 John Brown (FL)     — different person, same name
  17 David Brown         — unsubscribed; suppression has CAN-SPAM retention exemption
  18 Carmen Rios         — VIN-only consumer (DMS-only, never enrolled in telematics)
  19 Hiroshi Tanaka      — parent submitting on behalf of minor with no records
  20 Diane Phillips      — rich coded inferred_attributes (decode-pipeline demo)

Downgrade just truncates everything in the source schemas. Re-runnable.
"""
from typing import Sequence, Union
from alembic import op


revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _raw(sql: str) -> None:
    """Execute SQL via the DBAPI cursor directly, bypassing SQLAlchemy's
    :param parser. Necessary because our JSON literals contain `"key":N`
    sequences that SQLAlchemy would otherwise mistake for bind params."""
    op.get_bind().exec_driver_sql(sql)


def upgrade() -> None:
    # ─────────────────────────────────────────────────────────────────
    # dwh.customer_main — golden record (20 rows)
    # Stable UUIDs: a100000X-0000-4000-a000-00000000000X where X = person index
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO dwh.customer_main (
        party_id, first_nm, last_nm, previous_last_nm, full_legal_nm, birth_dt,
        primary_email_addr, primary_phone_e164, primary_state_cd, primary_address_text,
        household_key, consent_marketing, consent_telematics, source_system_keys
    ) VALUES
      ('a1000001-0000-4000-a000-000000000001', 'Maria',    'Chen',     NULL,        'Maria Chen',     '1985-03-12',
       'maria.chen.com',      '+14155550101', 'CA', '742 Evergreen Terrace, San Francisco, CA 94102',
       'b1000001-0000-4000-a000-000000000001', true,  true,  '{"crm":"003C001","marketing":1,"vin":"1HGBH41JXMN100001"}'::jsonb),

      ('a1000002-0000-4000-a000-000000000002', 'James',    'Williams', NULL,        'James Williams', '1972-07-04',
       'jwilliams.com',     '+18605550303', 'CT', '99 Charter Oak Ave, Hartford, CT 06106',
       'b1000002-0000-4000-a000-000000000002', false, true,  '{"crm":"003C002","marketing":2}'::jsonb),

      ('a1000003-0000-4000-a000-000000000003', 'Karen',    'Lee',      NULL,        'Karen Lee',      '1979-11-22',
       'karen.lee.com',       '+12035550909', 'CT', '14 Elm St, Stamford, CT 06901',
       'b1000003-0000-4000-a000-000000000003', true,  false, '{"crm":"003C003","marketing":3}'::jsonb),

      ('a1000004-0000-4000-a000-000000000004', 'Robert',   'Johnson',  NULL,        'Robert Johnson', '1968-02-15',
       'rjohnson.com',        '+13105550606', 'CA', '88 Pacific Ave, Los Angeles, CA 90013',
       'b1000004-0000-4000-a000-000000000004', true,  true,  '{"crm":"003C004","marketing":4}'::jsonb),

      ('a1000005-0000-4000-a000-000000000005', 'Patricia', 'Davis',    NULL,        'Patricia Davis', '1961-09-30',
       'pat.davis.com',         '+18045550707', 'VA', '1700 King St, Alexandria, VA 22314',
       'b1000005-0000-4000-a000-000000000005', true,  true,  '{"crm":"003C005","marketing":5}'::jsonb),

      -- Sofia: maiden Rodriguez → married Chen. Note CRM caught the rename, marketing did NOT.
      ('a1000006-0000-4000-a000-000000000006', 'Sofia',    'Chen',     'Rodriguez', 'Sofia Chen',     '1990-05-18',
       'sofia.chen.com',      '+15715550202', 'VA', '1800 Maple Drive, Arlington, VA 22201',
       'b1000006-0000-4000-a000-000000000006', true,  true,  '{"crm":"003C006","marketing":6,"marketing_legacy":"sofia.rodriguez.com"}'::jsonb),

      -- John Smith: email changed when employer changed. DWH still has old, CRM has new.
      ('a1000007-0000-4000-a000-000000000007', 'John',     'Smith',    NULL,        'John Smith',     '1983-12-01',
       'jsmith.com',     '+15125550404', 'TX', '2100 Congress Ave, Austin, TX 78701',
       'b1000007-0000-4000-a000-000000000007', false, false, '{"crm":"003C007","marketing":7,"current_email":"john.smith.com"}'::jsonb),

      -- Emily: sold the car, but telematics record still attached. No CRM record.
      ('a1000008-0000-4000-a000-000000000008', 'Emily',    'Nakamura', NULL,        'Emily Nakamura', '1992-06-10',
       'emily.nakamura.com','+14155550505','CA','29 Lombard St, San Francisco, CA 94133',
       'b1000008-0000-4000-a000-000000000008', false, true,  '{}'::jsonb),

      -- Aisha: marketing-only. Never bought a car. Signed up for sweepstakes.
      ('a1000009-0000-4000-a000-000000000009', 'Aisha',    'Patel',    NULL,        'Aisha Patel',    '1995-08-25',
       'aisha.patel.com',     '+16505551111', 'CA', NULL,
       'b1000009-0000-4000-a000-000000000009', true,  false, '{"marketing":9}'::jsonb),

      -- Thomas + Linda: shared household
      ('a1000010-0000-4000-a000-000000000010', 'Thomas',   'Wilson',   NULL,        'Thomas Wilson',  '1975-04-19',
       'twils.com',           '+18045551515', 'VA', '901 Cary St, Richmond, VA 23220',
       'b1000010-0000-4000-a000-000000000010', false, true,  '{"crm":"003C010","marketing":10}'::jsonb),

      ('a1000011-0000-4000-a000-000000000011', 'Linda',    'Wilson',   'Brennan',   'Linda Wilson',   '1977-10-08',
       'linda.wilson.com',    '+18045551516', 'VA', '901 Cary St, Richmond, VA 23220',
       'b1000010-0000-4000-a000-000000000010', true,  false, '{"crm":"003C011","marketing":11}'::jsonb),

      -- Michael / "Mike" Torres
      ('a1000012-0000-4000-a000-000000000012', 'Michael',  'Torres',   NULL,        'Michael Torres', '1980-01-30',
       'mtorres.com',        '+12135550808', 'CA', '450 Spring St, Los Angeles, CA 90013',
       'b1000012-0000-4000-a000-000000000012', false, true,  '{"crm":"003C012","marketing":12}'::jsonb),

      -- Angela: two VINs (her + teen's car)
      ('a1000013-0000-4000-a000-000000000013', 'Angela',   'Martinez', NULL,        'Angela Martinez','1976-03-22',
       'amartinez.com',       '+18185551414', 'CA', '6201 Hollywood Blvd, Los Angeles, CA 90028',
       'b1000013-0000-4000-a000-000000000013', true,  true,  '{"crm":"003C013","marketing":13}'::jsonb),

      -- Jamie: same number, different formats
      ('a1000014-0000-4000-a000-000000000014', 'Jamie',    'O''Brien', NULL,        'Jamie O''Brien', '1988-07-14',
       'jamie.obrien.com',    '+12035552020', 'CT', '70 Audubon St, New Haven, CT 06510',
       'b1000014-0000-4000-a000-000000000014', true,  true,  '{"crm":"003C014","marketing":14}'::jsonb),

      -- Two John Browns, different states
      ('a1000015-0000-4000-a000-000000000015', 'John',     'Brown',    NULL,        'John Brown',     '1982-11-05',
       'john.brown1.com',     '+15125551717', 'TX', '500 Main St, Houston, TX 77002',
       'b1000015-0000-4000-a000-000000000015', false, false, '{"crm":"003C015"}'::jsonb),

      ('a1000016-0000-4000-a000-000000000016', 'John',     'Brown',    NULL,        'John Brown',     '1991-04-18',
       'jbrown.fl.com',       '+13055551818', 'FL', '301 Ocean Dr, Miami Beach, FL 33139',
       'b1000016-0000-4000-a000-000000000016', false, false, '{"crm":"003C016"}'::jsonb),

      -- David: unsubscribed; suppression has CAN-SPAM retention requirement
      ('a1000017-0000-4000-a000-000000000017', 'David',    'Brown',    NULL,        'David Brown',    '1965-09-12',
       'david.brown.com',   '+19725551010', 'TX', '1200 Oak Lawn Ave, Dallas, TX 75204',
       'b1000017-0000-4000-a000-000000000017', false, false, '{"crm":"003C017","marketing":17}'::jsonb),

      -- Carmen: DMS-only. No telematics, no marketing.
      ('a1000018-0000-4000-a000-000000000018', 'Carmen',   'Rios',     NULL,        'Carmen Rios',    '1971-12-24',
       'carmen.rios.com',     '+14085551919', 'CA', '15 Mission St, San Jose, CA 95110',
       'b1000018-0000-4000-a000-000000000018', false, false, '{}'::jsonb),

      -- Hiroshi: parent of a minor (no records for the minor)
      ('a1000019-0000-4000-a000-000000000019', 'Hiroshi',  'Tanaka',   NULL,        'Hiroshi Tanaka', '1980-06-08',
       'hiroshi.tanaka.com',  '+14085552121', 'CA', '88 Bryant St, San Jose, CA 95110',
       'b1000019-0000-4000-a000-000000000019', false, true,  '{"crm":"003C019","marketing":19}'::jsonb),

      -- Diane: rich coded inferred attributes (decode-pipeline showcase)
      ('a1000020-0000-4000-a000-000000000020', 'Diane',    'Phillips', NULL,        'Diane Phillips', '1984-02-28',
       'diane.phillips.com',  '+18045552222', 'VA', '210 W Franklin St, Richmond, VA 23220',
       'b1000020-0000-4000-a000-000000000020', true,  true,  '{"crm":"003C020","marketing":20}'::jsonb);
    """)

    # ─────────────────────────────────────────────────────────────────
    # dwh.inferred_attributes — coded ML/marketing fields
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO dwh.inferred_attributes (
        party_id, income_band_cd, marketing_seg_cd, vehicle_segment_cd, age_range_cd, education_cd, occupation_cd,
        churn_score, ltv_estimate_usd, propensity_to_buy_score, model_version
    ) VALUES
      ('a1000001-0000-4000-a000-000000000001', 'D', 'URB-P', 'SED-C', '4', '4', 'MGR', 0.1200,  45000.00, 0.7800, 'v3.2'),
      ('a1000002-0000-4000-a000-000000000002', 'F', 'RET-S', 'SUV-M', '5', '3', 'TCH', 0.2200,  62000.00, 0.4500, 'v3.2'),
      ('a1000003-0000-4000-a000-000000000003', 'D', 'FAM-S', 'SUV-M', '4', '4', 'MGR', 0.0800,  78000.00, 0.8200, 'v3.2'),
      ('a1000004-0000-4000-a000-000000000004', 'G', 'URB-A', 'TRK-F', '5', '4', 'EXE', 0.1500, 110000.00, 0.6500, 'v3.2'),
      ('a1000005-0000-4000-a000-000000000005', 'F', 'FAM-U', 'SUV-L', '6', '5', 'EXE', 0.0500, 145000.00, 0.5500, 'v3.2'),
      ('a1000006-0000-4000-a000-000000000006', 'C', 'FAM-U', 'SUV-M', '3', '4', 'PRO', 0.1800,  52000.00, 0.7100, 'v3.2'),
      ('a1000007-0000-4000-a000-000000000007', 'E', 'URB-P', 'SED-M', '4', '4', 'TCH', 0.3500,  38000.00, 0.3000, 'v3.2'),
      ('a1000010-0000-4000-a000-000000000010', 'F', 'FAM-S', 'TRK-M', '4', '3', 'TRA', 0.1100,  72000.00, 0.6800, 'v3.2'),
      ('a1000012-0000-4000-a000-000000000012', 'E', 'URB-P', 'SED-C', '4', '3', 'SVC', 0.2800,  35000.00, 0.4200, 'v3.2'),
      ('a1000013-0000-4000-a000-000000000013', 'F', 'FAM-S', 'SUV-L', '4', '4', 'MGR', 0.1000,  88000.00, 0.7700, 'v3.2'),
      ('a1000017-0000-4000-a000-000000000017', 'F', 'RET-S', 'SED-L', '6', '4', 'RET', 0.4500,  28000.00, 0.1500, 'v3.2'),
      ('a1000020-0000-4000-a000-000000000020', 'H', 'URB-A', 'SUV-L', '4', '5', 'EXE', 0.0300, 175000.00, 0.8800, 'v3.2');
    """)

    # ─────────────────────────────────────────────────────────────────
    # dwh.fct_purchase
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO dwh.fct_purchase (
        party_id, vin, vehicle_year, vehicle_make, vehicle_model, purchase_dt, dealer_id, financing_flag, purchase_price_usd
    ) VALUES
      ('a1000001-0000-4000-a000-000000000001', '1HGBH41JXMN100001', 2024, 'Acme', 'Sedan',     '2024-03-15', 'DLR-0042', true,  32500.00),
      ('a1000002-0000-4000-a000-000000000002', '1HGBH41JXMN100002', 2022, 'Acme', 'SUV',       '2022-06-10', 'DLR-0019', true,  41200.00),
      ('a1000003-0000-4000-a000-000000000003', '1HGBH41JXMN100003', 2023, 'Acme', 'SUV',       '2023-04-22', 'DLR-0019', false, 38900.00),
      ('a1000004-0000-4000-a000-000000000004', '1HGBH41JXMN100004', 2025, 'Acme', 'Truck',     '2025-01-15', 'DLR-0042', true,  52000.00),
      ('a1000005-0000-4000-a000-000000000005', '1HGBH41JXMN100005', 2021, 'Acme', 'SUV-XL',    '2021-08-30', 'DLR-0073', true,  58000.00),
      ('a1000005-0000-4000-a000-000000000005', '1HGBH41JXMN100025', 2024, 'Acme', 'Sedan',     '2024-11-12', 'DLR-0073', false, 34000.00),
      ('a1000006-0000-4000-a000-000000000006', '1HGBH41JXMN100006', 2021, 'Acme', 'SUV',       '2021-03-22', 'DLR-0073', true,  39500.00),
      ('a1000010-0000-4000-a000-000000000010', '1HGBH41JXMN100010', 2023, 'Acme', 'Truck',     '2023-07-18', 'DLR-0073', true,  48000.00),
      ('a1000012-0000-4000-a000-000000000012', '1HGBH41JXMN100012', 2020, 'Acme', 'Sedan',     '2020-11-05', 'DLR-0042', true,  28000.00),
      ('a1000013-0000-4000-a000-000000000013', '1HGBH41JXMN100013', 2022, 'Acme', 'SUV-XL',    '2022-09-15', 'DLR-0042', true,  61000.00),
      ('a1000013-0000-4000-a000-000000000013', '1HGBH41JXMN100023', 2024, 'Acme', 'Sedan',     '2024-08-20', 'DLR-0042', false, 31000.00),
      ('a1000017-0000-4000-a000-000000000017', '1HGBH41JXMN100017', 2019, 'Acme', 'Sedan-L',   '2019-05-12', 'DLR-0061', true,  42000.00),
      ('a1000018-0000-4000-a000-000000000018', '1HGBH41JXMN100018', 2020, 'Acme', 'Sedan',     '2020-07-08', 'DLR-0042', false, 26500.00),
      ('a1000019-0000-4000-a000-000000000019', '1HGBH41JXMN100019', 2024, 'Acme', 'SUV',       '2024-02-28', 'DLR-0042', true,  43000.00),
      ('a1000020-0000-4000-a000-000000000020', '1HGBH41JXMN100020', 2025, 'Acme', 'SUV-XL-EV', '2025-03-10', 'DLR-0073', false, 75000.00);
    """)

    # ─────────────────────────────────────────────────────────────────
    # dwh.fct_service_event
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO dwh.fct_service_event (
        party_id, vin, service_dt, dealer_id, service_type_cd, cost_usd, warranty_covered_flag
    ) VALUES
      ('a1000001-0000-4000-a000-000000000001', '1HGBH41JXMN100001', '2024-09-22', 'DLR-0042', 'OC',  85.00, false),
      ('a1000001-0000-4000-a000-000000000001', '1HGBH41JXMN100001', '2025-03-15', 'DLR-0042', 'OC',  92.00, false),
      ('a1000002-0000-4000-a000-000000000002', '1HGBH41JXMN100002', '2025-04-10', 'DLR-0019', 'WAR', 0.00,  true),
      ('a1000003-0000-4000-a000-000000000003', '1HGBH41JXMN100003', '2024-09-11', 'DLR-0019', 'OC',  78.00, false),
      ('a1000005-0000-4000-a000-000000000005', '1HGBH41JXMN100005', '2024-12-03', 'DLR-0073', 'RC',  0.00,  true),
      ('a1000006-0000-4000-a000-000000000006', '1HGBH41JXMN100006', '2023-07-14', 'DLR-0019', 'COL', 4200.00, false),
      ('a1000010-0000-4000-a000-000000000010', '1HGBH41JXMN100010', '2024-08-20', 'DLR-0073', 'OC',  88.00, false),
      ('a1000013-0000-4000-a000-000000000013', '1HGBH41JXMN100013', '2024-06-12', 'DLR-0042', 'WAR', 0.00,  true),
      ('a1000018-0000-4000-a000-000000000018', '1HGBH41JXMN100018', '2024-11-30', 'DLR-0042', 'OC',  72.00, false),
      ('a1000018-0000-4000-a000-000000000018', '1HGBH41JXMN100018', '2025-02-15', 'DLR-0042', 'RC',  0.00,  true);
    """)

    # ─────────────────────────────────────────────────────────────────
    # crm.account — households / dealers
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO crm.account (id, name, account_type, billing_state, billing_city, billing_street) VALUES
      ('001H001', 'Chen Household',     'Household', 'CA', 'San Francisco', '742 Evergreen Terrace'),
      ('001H002', 'Williams Household', 'Household', 'CT', 'Hartford',      '99 Charter Oak Ave'),
      ('001H003', 'Lee Household',      'Household', 'CT', 'Stamford',      '14 Elm St'),
      ('001H004', 'Johnson Household',  'Household', 'CA', 'Los Angeles',   '88 Pacific Ave'),
      ('001H005', 'Davis Household',    'Household', 'VA', 'Alexandria',    '1700 King St'),
      ('001H006', 'Chen-Rodriguez',     'Household', 'VA', 'Arlington',     '1800 Maple Drive'),
      ('001H007', 'Smith Household',    'Household', 'TX', 'Austin',        '2100 Congress Ave'),
      ('001H010', 'Wilson Household',   'Household', 'VA', 'Richmond',      '901 Cary St'),
      ('001H012', 'Torres Household',   'Household', 'CA', 'Los Angeles',   '450 Spring St'),
      ('001H013', 'Martinez Household', 'Household', 'CA', 'Los Angeles',   '6201 Hollywood Blvd'),
      ('001H014', 'O''Brien Household', 'Household', 'CT', 'New Haven',     '70 Audubon St'),
      ('001H015', 'Brown Household TX', 'Household', 'TX', 'Houston',       '500 Main St'),
      ('001H016', 'Brown Household FL', 'Household', 'FL', 'Miami Beach',   '301 Ocean Dr'),
      ('001H017', 'Brown Household DA', 'Household', 'TX', 'Dallas',        '1200 Oak Lawn Ave'),
      ('001H019', 'Tanaka Household',   'Household', 'CA', 'San Jose',      '88 Bryant St'),
      ('001H020', 'Phillips Household', 'Household', 'VA', 'Richmond',      '210 W Franklin St');
    """)

    # ─────────────────────────────────────────────────────────────────
    # crm.contact — Salesforce-shaped contacts (note: John Smith has UPDATED email)
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO crm.contact (
        id, account_id, first_name, last_name, email, phone, mailing_state, mailing_street, mailing_city,
        birthdate, previous_last_name, marketing_opt_in, do_not_call
    ) VALUES
      ('003C001', '001H001', 'Maria',    'Chen',     'maria.chen.com',     '(415) 555-0101', 'CA', '742 Evergreen Terrace', 'San Francisco', '1985-03-12', NULL,        true,  false),
      ('003C002', '001H002', 'James',    'Williams', 'jwilliams.com',    '(860) 555-0303', 'CT', '99 Charter Oak Ave',    'Hartford',      '1972-07-04', NULL,        false, false),
      ('003C003', '001H003', 'Karen',    'Lee',      'karen.lee.com',      '(203) 555-0909', 'CT', '14 Elm St',             'Stamford',      '1979-11-22', NULL,        true,  false),
      ('003C004', '001H004', 'Robert',   'Johnson',  'rjohnson.com',       '(310) 555-0606', 'CA', '88 Pacific Ave',        'Los Angeles',   '1968-02-15', NULL,        true,  false),
      ('003C005', '001H005', 'Patricia', 'Davis',    'pat.davis.com',        '(804) 555-0707', 'VA', '1700 King St',          'Alexandria',    '1961-09-30', NULL,        true,  false),
      -- Sofia: CRM caught the name change (previous_last_name="Rodriguez")
      ('003C006', '001H006', 'Sofia',    'Chen',     'sofia.chen.com',     '(571) 555-0202', 'VA', '1800 Maple Drive',      'Arlington',     '1990-05-18', 'Rodriguez', true,  false),
      -- John Smith: CRM has the NEW email (jobchange); DWH still has the old
      ('003C007', '001H007', 'John',     'Smith',    'john.smith.com',    '(512) 555-0404', 'TX', '2100 Congress Ave',     'Austin',        '1983-12-01', NULL,        false, false),
      -- Thomas + Linda share account
      ('003C010', '001H010', 'Thomas',   'Wilson',   'twils.com',          '(804) 555-1515', 'VA', '901 Cary St',           'Richmond',      '1975-04-19', NULL,        false, false),
      ('003C011', '001H010', 'Linda',    'Wilson',   'linda.wilson.com',   '(804) 555-1516', 'VA', '901 Cary St',           'Richmond',      '1977-10-08', 'Brennan',   true,  false),
      ('003C012', '001H012', 'Michael',  'Torres',   'mtorres.com',       '(213) 555-0808', 'CA', '450 Spring St',         'Los Angeles',   '1980-01-30', NULL,        false, true),
      ('003C013', '001H013', 'Angela',   'Martinez', 'amartinez.com',      '(818) 555-1414', 'CA', '6201 Hollywood Blvd',   'Los Angeles',   '1976-03-22', NULL,        true,  false),
      ('003C014', '001H014', 'Jamie',    'O''Brien', 'jamie.obrien.com',   '(203) 555-2020', 'CT', '70 Audubon St',         'New Haven',     '1988-07-14', NULL,        true,  false),
      ('003C015', '001H015', 'John',     'Brown',    'john.brown1.com',    '(512) 555-1717', 'TX', '500 Main St',           'Houston',       '1982-11-05', NULL,        false, false),
      ('003C016', '001H016', 'John',     'Brown',    'jbrown.fl.com',      '(305) 555-1818', 'FL', '301 Ocean Dr',          'Miami Beach',   '1991-04-18', NULL,        false, false),
      ('003C017', '001H017', 'David',    'Brown',    'david.brown.com',  '(972) 555-1010', 'TX', '1200 Oak Lawn Ave',     'Dallas',        '1965-09-12', NULL,        false, false),
      ('003C019', '001H019', 'Hiroshi',  'Tanaka',   'hiroshi.tanaka.com', '(408) 555-2121', 'CA', '88 Bryant St',          'San Jose',      '1980-06-08', NULL,        false, false),
      ('003C020', '001H020', 'Diane',    'Phillips', 'diane.phillips.com', '(804) 555-2222', 'VA', '210 W Franklin St',     'Richmond',      '1984-02-28', NULL,        true,  false);
    """)

    # ─────────────────────────────────────────────────────────────────
    # crm.support_case — sparse, a few interesting tickets
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO crm.support_case (id, contact_id, account_id, subject, description, status, origin, vin, closed_date) VALUES
      ('500001', '003C006', '001H006', 'Update name after marriage',     'Customer requesting name change from Rodriguez to Chen.',                'Closed', 'Email',  '1HGBH41JXMN100006', '2022-09-05 14:00:00+00'),
      ('500002', '003C007', '001H007', 'Email/employer change',          'Customer wants to update primary email after job change.',                'Closed', 'Web',    NULL,                '2024-02-10 11:30:00+00'),
      ('500003', '003C012', '001H012', 'Roadside assistance — flat tire','Reported flat tire on I-405. Service dispatched.',                       'Closed', 'Phone',  '1HGBH41JXMN100012', '2023-08-15 17:00:00+00'),
      ('500004', '003C013', '001H013', 'Recall notification follow-up',  'Acknowledged airbag recall. Scheduled appointment.',                     'Closed', 'Email',  '1HGBH41JXMN100013', '2024-06-12 09:00:00+00'),
      ('500005', '003C017', '001H017', 'Marketing opt-out request',      'Customer asked to be removed from all marketing communications.',         'Closed', 'Web',    NULL,                '2024-11-20 13:00:00+00'),
      ('500006', '003C019', '001H019', 'Telematics consent question',    'Asked what data is collected by Connect platform.',                       'Closed', 'Email',  '1HGBH41JXMN100019', '2024-04-02 10:30:00+00');
    """)

    # ─────────────────────────────────────────────────────────────────
    # crm.opportunity — purchase intent
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO crm.opportunity (id, account_id, contact_id, name, stage_name, amount, close_date, vehicle_interest, dealer_id) VALUES
      ('006001', '001H004', '003C004', '2025 Acme Truck — Robert Johnson',   'Closed Won',    52000.00, '2025-01-15', 'Acme Truck',     'DLR-0042'),
      ('006002', '001H013', '003C013', '2024 Acme Sedan — Angela Martinez',  'Closed Won',    31000.00, '2024-08-20', 'Acme Sedan',     'DLR-0042'),
      ('006003', '001H020', '003C020', '2025 Acme SUV-XL EV — Diane Phillips','Closed Won',   75000.00, '2025-03-10', 'Acme SUV-XL EV', 'DLR-0073'),
      ('006004', '001H010', '003C010', 'Trade-in inquiry — Thomas Wilson',   'Qualification', 45000.00, '2026-08-01', 'Acme Truck',     'DLR-0073');
    """)

    # ─────────────────────────────────────────────────────────────────
    # marketing.subscriber — bigserial; we set ids 1–20 explicitly
    # NOTE: Sofia has the LEGACY email (sofia.rodriguez), not her new one.
    # NOTE: John Smith has BOTH emails as separate subscriber rows (legacy duplicate).
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO marketing.subscriber (subscriber_id, email, first_name, last_name, phone, state, external_customer_id, source_channel, status) VALUES
      (1,  'maria.chen.com',          'Maria',    'Chen',      '4155550101',     'CA', '003C001', 'crm_sync',     'active'),
      (2,  'jwilliams.com',          'James',    'Williams',  '8605550303',     'CT', '003C002', 'crm_sync',     'active'),
      (3,  'karen.lee.com',            'Karen',    'Lee',       '2035550909',     'CT', '003C003', 'crm_sync',     'active'),
      (4,  'rjohnson.com',             'Robert',   'Johnson',   '3105550606',     'CA', '003C004', 'crm_sync',     'active'),
      (5,  'pat.davis.com',              'Patricia', 'Davis',     '8045550707',     'VA', '003C005', 'crm_sync',     'active'),
      -- Sofia: marketing kept old maiden-name email
      (6,  'sofia.rodriguez.com',      'Sofia',    'Rodriguez', '5715550202',     'VA', NULL,      'web_signup',   'active'),
      -- John Smith: legacy old email never cleaned
      (7,  'jsmith.com',          'John',     'Smith',     '5125550404',     'TX', '003C007', 'crm_sync',     'active'),
      (9,  'aisha.patel.com',          'Aisha',    'Patel',     '6505551111',     'CA', NULL,      'dealer_event', 'active'),
      (10, 'twils.com',                'Thomas',   'Wilson',    '8045551515',     'VA', '003C010', 'crm_sync',     'unsubscribed'),
      (11, 'linda.wilson.com',         'Linda',    'Wilson',    '8045551516',     'VA', '003C011', 'web_signup',   'active'),
      (12, 'mtorres.com',             'Michael',  'Torres',    '2135550808',     'CA', '003C012', 'crm_sync',     'active'),
      (13, 'amartinez.com',            'Angela',   'Martinez',  '8185551414',     'CA', '003C013', 'crm_sync',     'active'),
      (14, 'jamie.obrien.com',         'Jamie',    'O''Brien',  '4155550101',     'CT', '003C014', 'crm_sync',     'active'),
      (17, 'david.brown.com',        'David',    'Brown',     '9725551010',     'TX', '003C017', 'crm_sync',     'suppressed'),
      (19, 'hiroshi.tanaka.com',       'Hiroshi',  'Tanaka',    '4085552121',     'CA', '003C019', 'crm_sync',     'active'),
      (20, 'diane.phillips.com',       'Diane',    'Phillips',  '8045552222',     'VA', '003C020', 'crm_sync',     'active'),
      -- John Smith's NEW email also lives here (duplicate of #7, never reconciled)
      (21, 'john.smith.com',          'John',     'Smith',     '5125550404',     'TX', NULL,      'web_signup',   'active');

    SELECT setval('marketing.subscriber_subscriber_id_seq', 100);
    """)

    # ─────────────────────────────────────────────────────────────────
    # marketing.subscription_preference
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO marketing.subscription_preference (subscriber_id, channel, category, opted_in) VALUES
      (1, 'email', 'marketing', true),  (1, 'email', 'service_reminder', true),  (1, 'email', 'recall', true),
      (2, 'email', 'marketing', false), (2, 'email', 'service_reminder', true),  (2, 'email', 'recall', true),
      (3, 'email', 'marketing', true),  (3, 'email', 'newsletter', true),
      (4, 'email', 'marketing', true),  (4, 'sms',   'service_reminder', true),
      (5, 'email', 'marketing', true),  (5, 'email', 'newsletter', true),  (5, 'sms', 'recall', true),
      (6, 'email', 'marketing', true),  (6, 'email', 'newsletter', true),
      (7, 'email', 'marketing', false), (7, 'email', 'recall', true),
      (9, 'email', 'marketing', true),
      (10,'email', 'marketing', false), (10,'email', 'recall', true),
      (11,'email', 'marketing', true),  (11,'email', 'newsletter', true),
      (12,'email', 'marketing', true),
      (13,'email', 'marketing', true),  (13,'sms',   'recall', true),
      (14,'email', 'marketing', true),
      (17,'email', 'marketing', false), (17,'email', 'recall', true),
      (19,'email', 'marketing', false),
      (20,'email', 'marketing', true),  (20,'email', 'newsletter', true), (20,'sms', 'recall', true),
      (21,'email', 'marketing', true);
    """)

    # ─────────────────────────────────────────────────────────────────
    # marketing.send_history — recent campaigns
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO marketing.send_history (send_id, subscriber_id, campaign_id, template_name, channel, subject, send_ts) VALUES
      (1,   1, 'CMP-2025-Q1', 'spring_service_reminder',  'email', 'Spring service tune-up: book by April 30',   '2025-03-10 10:00:00+00'),
      (2,   1, 'CMP-2025-Q3', 'fall_event_invite',        'email', 'You''re invited: Fall Drive Event',           '2025-09-15 14:00:00+00'),
      (3,   2, 'REC-2025-A1', 'recall_airbag',            'email', 'Important recall notice — your 2022 SUV',     '2025-04-01 09:00:00+00'),
      (4,   3, 'CMP-2025-Q1', 'spring_service_reminder',  'email', 'Spring service tune-up: book by April 30',   '2025-03-10 10:00:00+00'),
      (5,   3, 'CMP-2025-Q4', 'holiday_offer',            'email', 'Year-end savings on accessories',             '2025-11-20 11:00:00+00'),
      (6,   4, 'CMP-2025-Q2', 'truck_launch',             'email', 'Introducing the 2025 Acme Truck',             '2024-12-15 09:00:00+00'),
      (7,   5, 'CMP-2025-Q3', 'fall_event_invite',        'email', 'VIP preview: Fall Drive Event',               '2025-09-15 14:00:00+00'),
      (8,   6, 'CMP-2025-Q1', 'spring_service_reminder',  'email', 'Spring service tune-up: book by April 30',   '2025-03-10 10:00:00+00'),
      (9,   6, 'CMP-2025-Q4', 'newsletter_dec',           'email', 'Year in review',                              '2025-12-05 10:00:00+00'),
      (10, 11, 'CMP-2025-Q2', 'family_safety',            'email', 'Family-friendly features for your SUV',       '2025-05-20 11:00:00+00'),
      (11, 13, 'REC-2025-A1', 'recall_airbag',            'email', 'Important recall notice — your 2022 SUV-XL',  '2025-04-01 09:00:00+00'),
      (12, 13, 'REC-2025-A1', 'recall_airbag',            'sms',   'ACME RECALL: Action required for your 2022 SUV-XL', '2025-04-01 12:00:00+00'),
      (13, 14, 'CMP-2025-Q2', 'connected_car',            'email', 'Get the most from your Connect features',    '2025-06-10 10:00:00+00'),
      (14, 20, 'CMP-2025-EV', 'ev_charging_partner',      'email', 'Partner perks for EV owners',                 '2025-04-15 10:00:00+00'),
      (15, 20, 'CMP-2025-Q4', 'newsletter_dec',           'email', 'Year in review',                              '2025-12-05 10:00:00+00');

    SELECT setval('marketing.send_history_send_id_seq', 100);
    """)

    # ─────────────────────────────────────────────────────────────────
    # marketing.engagement_event — opens, clicks, bounces
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO marketing.engagement_event (send_id, subscriber_id, event_type, event_ts) VALUES
      (1,   1, 'open',  '2025-03-10 11:15:00+00'),
      (1,   1, 'click', '2025-03-10 11:16:00+00'),
      (3,   2, 'open',  '2025-04-01 12:00:00+00'),
      (3,   2, 'click', '2025-04-01 12:02:00+00'),
      (5,   3, 'open',  '2025-11-20 13:30:00+00'),
      (8,   6, 'open',  '2025-03-11 09:00:00+00'),
      (10, 11, 'open',  '2025-05-20 18:00:00+00'),
      (10, 11, 'click', '2025-05-20 18:02:00+00'),
      (11, 13, 'open',  '2025-04-01 14:00:00+00'),
      (14, 20, 'open',  '2025-04-15 11:00:00+00'),
      (14, 20, 'click', '2025-04-15 11:01:00+00'),
      -- David Brown — bounce + complaint that led to suppression
      (NULL, 17, 'bounce',    '2024-10-15 10:00:00+00'),
      (NULL, 17, 'complaint', '2024-11-10 15:00:00+00');
    """)

    # ─────────────────────────────────────────────────────────────────
    # marketing.suppression — David Brown unsubscribed; CAN-SPAM evidence retention
    # Thomas Wilson unsubscribed last quarter
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO marketing.suppression (subscriber_id, reason, suppressed_at, retention_required_until) VALUES
      (10, 'unsubscribed',     '2025-12-01 10:00:00+00', '2030-12-01 10:00:00+00'),
      (17, 'spam_complaint',   '2024-11-10 15:30:00+00', '2029-11-10 15:30:00+00');
    """)

    # ─────────────────────────────────────────────────────────────────
    # marketing.loyalty_member — only some are enrolled
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO marketing.loyalty_member (member_id, subscriber_id, current_tier, points_balance, lifetime_points_earned, status) VALUES
      ('NX-100001', 1,  'gold',     12500, 32000, 'active'),
      ('NX-100003', 3,  'silver',    4200, 14000, 'active'),
      ('NX-100005', 5,  'platinum', 45000, 88000, 'active'),
      ('NX-100013', 13, 'silver',    3100, 11500, 'active'),
      ('NX-100020', 20, 'platinum', 32000, 60000, 'active'),
      -- David Brown was enrolled before he unsubscribed; loyalty is now inactive but record kept for the points balance
      ('NX-100017', 17, 'silver',    2500, 18000, 'inactive');
    """)

    # ─────────────────────────────────────────────────────────────────
    # dealer_dms.service_record — VIN-centric, lots of customer-name variation
    # NOTE: Mike (not Michael) — DMS records the dealer's casual entry.
    # NOTE: Carmen has DMS-only service history.
    # NOTE: Two John Browns + Linda Wilson all share or differ by nothing more than email.
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO dealer_dms.service_record (
        service_id, vin, customer_email, customer_phone, customer_first_name, customer_last_name,
        service_dt, dealer_id, mileage, service_type, notes, warranty_covered
    ) VALUES
      ('DMS-001', '1HGBH41JXMN100001', 'maria.chen.com',         '415-555-0101', 'Maria',    'Chen',     '2024-09-22', 'DLR-0042', 8200,  'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-002', '1HGBH41JXMN100002', 'jwilliams.com',        '860-555-0303', 'James',    'Williams', '2025-04-10', 'DLR-0019', 22500, 'warranty',   'Transmission solenoid replaced under warranty', true),
      ('DMS-003', '1HGBH41JXMN100003', 'karen.lee.com',          '203-555-0909', 'Karen',    'Lee',      '2024-09-11', 'DLR-0019', 14200, 'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-004', '1HGBH41JXMN100005', 'pat.davis.com',            '804-555-0707', 'Patricia', 'Davis',    '2024-12-03', 'DLR-0073', 38900, 'recall',     'Airbag recall remediation',      true),
      ('DMS-005', '1HGBH41JXMN100006', 'sofia.rodriguez.com',    '571-555-0202', 'Sofia',    'Rodriguez','2023-07-14', 'DLR-0019', 18000, 'collision',  'Front bumper repair',            false),
      ('DMS-006', '1HGBH41JXMN100006', 'sofia.chen.com',         '571-555-0202', 'Sofia',    'Chen',     '2024-08-22', 'DLR-0019', 28000, 'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-007', '1HGBH41JXMN100010', 'twils.com',              '804-555-1515', 'Thomas',   'Wilson',   '2024-08-20', 'DLR-0073', 12000, 'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-008', '1HGBH41JXMN100010', 'linda.wilson.com',       '804-555-1516', 'Linda',    'Wilson',   '2025-01-15', 'DLR-0073', 14000, 'general',    'Tire rotation + alignment (booked by Linda for the household truck)', false),
      -- Mike (not Michael) — same person, dealer typed it casually
      ('DMS-009', '1HGBH41JXMN100012', 'mtorres.com',           '213-555-0808', 'Mike',     'Torres',   '2023-08-15', 'DLR-0042', 31000, 'general',    'Roadside towing — flat tire',    false),
      ('DMS-010', '1HGBH41JXMN100013', 'amartinez.com',          '818-555-1414', 'Angela',   'Martinez', '2024-06-12', 'DLR-0042', 22500, 'warranty',   'Sensor replacement under warranty', true),
      ('DMS-011', '1HGBH41JXMN100023', 'amartinez.com',          '818-555-1414', 'Angela',   'Martinez', '2025-04-22', 'DLR-0042', 8500,  'oil_change', 'First service — teen driver vehicle', false),
      -- Jamie's phone shows up in DMS in dot-format
      ('DMS-012', '1HGBH41JXMN100014', 'jamie.obrien.com',       '203.555.2020', 'Jamie',    'O''Brien', '2024-10-05', 'DLR-0019', 9800,  'oil_change', 'Synthetic oil + filter',         false),
      -- Two John Browns: same name, different emails/phones
      ('DMS-013', '1HGBH41JXMN100015', 'john.brown1.com',        '512-555-1717', 'John',     'Brown',    '2024-07-15', 'DLR-0061', 18000, 'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-014', '1HGBH41JXMN100016', 'jbrown.fl.com',          '305-555-1818', 'John',     'Brown',    '2024-09-22', 'DLR-0095', 12000, 'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-015', '1HGBH41JXMN100017', 'david.brown.com',      '972-555-1010', 'David',    'Brown',    '2024-10-30', 'DLR-0061', 67000, 'general',    'Brake pad replacement',          false),
      -- Carmen: DMS-only customer (no telematics, no marketing)
      ('DMS-016', '1HGBH41JXMN100018', 'carmen.rios.com',        '408-555-1919', 'Carmen',   'Rios',     '2024-11-30', 'DLR-0042', 42000, 'oil_change', 'Synthetic oil + filter',         false),
      ('DMS-017', '1HGBH41JXMN100018', 'carmen.rios.com',        '408-555-1919', 'Carmen',   'Rios',     '2025-02-15', 'DLR-0042', 44500, 'recall',     'Airbag recall remediation',      true),
      ('DMS-018', '1HGBH41JXMN100019', 'hiroshi.tanaka.com',     '408-555-2121', 'Hiroshi',  'Tanaka',   '2024-12-20', 'DLR-0042', 5200,  'general',    'Window tint installation',       false),
      ('DMS-019', '1HGBH41JXMN100020', 'diane.phillips.com',     '804-555-2222', 'Diane',    'Phillips', '2025-04-30', 'DLR-0073', 6800,  'general',    'Software/firmware update',       true);
    """)

    # ─────────────────────────────────────────────────────────────────
    # dealer_dms.repair_invoice — one invoice per service event, sample subset
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO dealer_dms.repair_invoice (
        invoice_id, service_id, vin, line_items, parts_total_usd, labor_total_usd, total_usd, paid, invoice_dt
    ) VALUES
      ('INV-001', 'DMS-001', '1HGBH41JXMN100001', '[{"part":"oil filter","sku":"OF-2024-A","qty":1,"price":18.00},{"part":"5W-30 synthetic","sku":"SY-5W30","qty":5,"price":12.00}]'::jsonb, 78.00,  85.00, 163.00, true,  '2024-09-22'),
      ('INV-002', 'DMS-002', '1HGBH41JXMN100002', '[{"part":"transmission solenoid","sku":"TS-AC22","qty":1,"price":380.00}]'::jsonb,                                                       380.00, 220.00, 0.00,   true,  '2025-04-10'),
      ('INV-005', 'DMS-005', '1HGBH41JXMN100006', '[{"part":"front bumper","sku":"BMP-F-AC","qty":1,"price":1200.00},{"part":"paint","sku":"PNT-RED","qty":1,"price":350.00}]'::jsonb,        1550.00, 2650.00, 4200.00, true, '2023-07-14'),
      ('INV-009', 'DMS-009', '1HGBH41JXMN100012', '[{"part":"towing service","sku":"TOW-LOCAL","qty":1,"price":250.00}]'::jsonb,                                                             0.00,    250.00, 250.00,  true, '2023-08-15'),
      ('INV-013', 'DMS-013', '1HGBH41JXMN100015', '[{"part":"oil filter","sku":"OF-2024-A","qty":1,"price":18.00},{"part":"5W-30 synthetic","sku":"SY-5W30","qty":5,"price":12.00}]'::jsonb, 78.00,   85.00, 163.00, true, '2024-07-15'),
      ('INV-016', 'DMS-016', '1HGBH41JXMN100018', '[{"part":"oil filter","sku":"OF-2020-A","qty":1,"price":15.00},{"part":"5W-20","sku":"SY-5W20","qty":5,"price":10.00}]'::jsonb,           65.00,   72.00, 137.00, true, '2024-11-30');
    """)

    # ─────────────────────────────────────────────────────────────────
    # vehicle_telematics.vin_registration — connected-car enrollments
    # NOTE: Emily owns the car only here (sold it but registration lingers).
    # NOTE: Carmen and the two John Browns are NOT enrolled — by design.
    # NOTE: Angela has TWO VINs (her car + teen's car).
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO vehicle_telematics.vin_registration (
        vin, owner_email, owner_first_name, owner_last_name, owner_phone, registration_state,
        vehicle_year, vehicle_make, vehicle_model,
        consent_telematics, consent_location, consent_data_sharing
    ) VALUES
      ('1HGBH41JXMN100001', 'maria.chen.com',          'Maria',   'Chen',     '4155550101', 'CA', 2024, 'Acme', 'Sedan',     true,  true,  true),
      ('1HGBH41JXMN100002', 'jwilliams.com',         'James',   'Williams', '8605550303', 'CT', 2022, 'Acme', 'SUV',       true,  true,  false),
      ('1HGBH41JXMN100004', 'rjohnson.com',            'Robert',  'Johnson',  '3105550606', 'CA', 2025, 'Acme', 'Truck',     true,  true,  true),
      ('1HGBH41JXMN100005', 'pat.davis.com',             'Patricia','Davis',    '8045550707', 'VA', 2021, 'Acme', 'SUV-XL',    true,  false, false),
      -- Sofia: telematics has the NEW name
      ('1HGBH41JXMN100006', 'sofia.chen.com',          'Sofia',   'Chen',     '5715550202', 'VA', 2021, 'Acme', 'SUV',       true,  true,  true),
      -- Emily: sold the car, but registration NEVER cancelled
      ('1HGBH41JXMN100008', 'emily.nakamura.com', 'Emily',   'Nakamura', '4155550505', 'CA', 2019, 'Acme', 'Sedan',     true,  true,  false),
      ('1HGBH41JXMN100010', 'twils.com',               'Thomas',  'Wilson',   '8045551515', 'VA', 2023, 'Acme', 'Truck',     true,  true,  false),
      ('1HGBH41JXMN100012', 'mtorres.com',            'Michael', 'Torres',   '2135550808', 'CA', 2020, 'Acme', 'Sedan',     true,  true,  false),
      -- Angela's two cars
      ('1HGBH41JXMN100013', 'amartinez.com',           'Angela',  'Martinez', '8185551414', 'CA', 2022, 'Acme', 'SUV-XL',    true,  true,  true),
      ('1HGBH41JXMN100023', 'amartinez.com',           'Angela',  'Martinez', '8185551414', 'CA', 2024, 'Acme', 'Sedan',     true,  true,  false),
      ('1HGBH41JXMN100014', 'jamie.obrien.com',        'Jamie',   'O''Brien', '4155550101', 'CT', 2024, 'Acme', 'Sedan',     true,  true,  true),
      ('1HGBH41JXMN100019', 'hiroshi.tanaka.com',      'Hiroshi', 'Tanaka',   '4085552121', 'CA', 2024, 'Acme', 'SUV',       true,  true,  false),
      ('1HGBH41JXMN100020', 'diane.phillips.com',      'Diane',   'Phillips', '8045552222', 'VA', 2025, 'Acme', 'SUV-XL-EV', true,  true,  true);
    """)

    # ─────────────────────────────────────────────────────────────────
    # vehicle_telematics.trip_event — sample trips (PII-sensitive)
    # ─────────────────────────────────────────────────────────────────
    _raw("""
    INSERT INTO vehicle_telematics.trip_event (
        vin, trip_start_ts, trip_end_ts, start_lat, start_lon, end_lat, end_lon,
        distance_miles, max_speed_mph, hard_brake_count, geofence_alerts
    ) VALUES
      ('1HGBH41JXMN100001', '2025-04-15 08:30:00+00', '2025-04-15 09:05:00+00', 37.7749, -122.4194, 37.4419, -122.1430, 32.50, 68, 1, '[]'::jsonb),
      ('1HGBH41JXMN100001', '2025-04-15 17:30:00+00', '2025-04-15 18:10:00+00', 37.4419, -122.1430, 37.7749, -122.4194, 32.50, 70, 0, '[]'::jsonb),
      ('1HGBH41JXMN100008', '2025-02-10 07:00:00+00', '2025-02-10 07:45:00+00', 37.7950, -122.4040, 37.5485, -121.9886, 38.20, 75, 2, '[]'::jsonb),
      ('1HGBH41JXMN100013', '2025-03-22 10:00:00+00', '2025-03-22 11:30:00+00', 34.0522, -118.2437, 33.7701, -118.1937, 25.80, 65, 0, '[]'::jsonb),
      ('1HGBH41JXMN100023', '2025-04-05 14:00:00+00', '2025-04-05 14:25:00+00', 34.0522, -118.2437, 34.1478, -118.1445, 12.40, 55, 3, '[{"alert":"speed_limit","value":"55 in 35 zone"}]'::jsonb),
      ('1HGBH41JXMN100020', '2025-04-20 09:00:00+00', '2025-04-20 10:15:00+00', 37.5407, -77.4360, 38.9072, -77.0369, 110.50, 78, 1, '[]'::jsonb);
    """)


def downgrade() -> None:
    # Truncate everything in source schemas (safe: only this seed populates them).
    # naica_demo.intake_requests is preserved.
    for schema, tables in [
        ('vehicle_telematics', ['trip_event', 'vin_registration']),
        ('dealer_dms',         ['repair_invoice', 'service_record']),
        ('marketing',          ['loyalty_member', 'suppression', 'engagement_event', 'send_history',
                                'subscription_preference', 'subscriber']),
        ('crm',                ['opportunity', 'support_case', 'contact', 'account']),
        ('dwh',                ['fct_service_event', 'fct_purchase', 'inferred_attributes',
                                'customer_main', 'stg_customer_unified']),
    ]:
        for t in tables:
            op.execute(f"TRUNCATE TABLE {schema}.{t} RESTART IDENTITY CASCADE")
