// SQL helpers for the chat-agent's source-system tools.
//
// All functions are read-only and parameterized. They power the
// `find_party_by_*`, `get_party_360`, `decode_inferred_attributes`, and
// `list_intake_requests` tools defined in `src/lib/tools.ts`. The agent
// boundary still holds: no INSERT/UPDATE/DELETE in this file.
//
// Identity stitching across schemas is email-based (matched against
// `dwh.customer_main.primary_email_addr`). When the same person has
// different emails in different systems (e.g., John Smith's old vs. new
// employer email) `getParty360` will under-report; the agent can compensate
// by calling `findPartyByEmail` on alt addresses first.

import { getPool } from '@/lib/db';
import { decodeField } from '@/lib/data';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Strip non-digits from a phone string; drop a leading '1' if length is 11. */
function normalizePhone(input: string): string {
  const digits = (input ?? '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

interface ProbeMatch {
  source: string;
  native_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface ProbeResult {
  search: Record<string, unknown>;
  matches: ProbeMatch[];
  match_count: number;
  distinct_dwh_party_ids: string[];
}

function buildProbeResult(
  search: Record<string, unknown>,
  rows: ProbeMatch[],
): ProbeResult {
  const dwh = rows.filter((r) => r.source === 'dwh.customer_main').map((r) => r.native_id);
  return {
    search,
    matches: rows,
    match_count: rows.length,
    distinct_dwh_party_ids: Array.from(new Set(dwh)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// findPartyByEmail
// ─────────────────────────────────────────────────────────────────────────────

const FIND_BY_EMAIL_SQL = `
  SELECT 'dwh.customer_main' AS source, party_id::text AS native_id,
         first_nm AS first_name, last_nm AS last_name,
         primary_email_addr AS email, primary_phone_e164 AS phone
    FROM dwh.customer_main WHERE lower(primary_email_addr) = $1
  UNION ALL
  SELECT 'crm.contact', id,
         first_name, last_name, email, phone
    FROM crm.contact WHERE lower(email) = $1
  UNION ALL
  SELECT 'marketing.subscriber', subscriber_id::text,
         first_name, last_name, email, phone
    FROM marketing.subscriber WHERE lower(email) = $1
  UNION ALL
  SELECT DISTINCT ON (customer_email)
         'dealer_dms.service_record', service_id,
         customer_first_name, customer_last_name, customer_email, customer_phone
    FROM dealer_dms.service_record WHERE lower(customer_email) = $1
  UNION ALL
  SELECT 'vehicle_telematics.vin_registration', vin,
         owner_first_name, owner_last_name, owner_email, owner_phone
    FROM vehicle_telematics.vin_registration WHERE lower(owner_email) = $1
  UNION ALL
  SELECT 'naica_demo.intake_requests', request_id,
         first_name, last_name, email::text, phone
    FROM naica_demo.intake_requests WHERE email = $1::citext
`;

export async function findPartyByEmail(email: string): Promise<ProbeResult> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await getPool().query<ProbeMatch>(FIND_BY_EMAIL_SQL, [normalized]);
  return buildProbeResult({ email: normalized }, rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// findPartyByPhone — normalize on both sides
// ─────────────────────────────────────────────────────────────────────────────

const FIND_BY_PHONE_SQL = `
  SELECT 'dwh.customer_main' AS source, party_id::text AS native_id,
         first_nm, last_nm, primary_email_addr, primary_phone_e164
    FROM dwh.customer_main
   WHERE regexp_replace(coalesce(primary_phone_e164,''), '[^0-9]', '', 'g') = $1
  UNION ALL
  SELECT 'crm.contact', id,
         first_name, last_name, email, phone
    FROM crm.contact
   WHERE regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') = $1
  UNION ALL
  SELECT 'marketing.subscriber', subscriber_id::text,
         first_name, last_name, email, phone
    FROM marketing.subscriber
   WHERE regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') = $1
  UNION ALL
  SELECT DISTINCT ON (customer_phone)
         'dealer_dms.service_record', service_id,
         customer_first_name, customer_last_name, customer_email, customer_phone
    FROM dealer_dms.service_record
   WHERE regexp_replace(coalesce(customer_phone,''), '[^0-9]', '', 'g') = $1
  UNION ALL
  SELECT 'vehicle_telematics.vin_registration', vin,
         owner_first_name, owner_last_name, owner_email, owner_phone
    FROM vehicle_telematics.vin_registration
   WHERE regexp_replace(coalesce(owner_phone,''), '[^0-9]', '', 'g') = $1
  UNION ALL
  SELECT 'naica_demo.intake_requests', request_id,
         first_name, last_name, email::text, phone
    FROM naica_demo.intake_requests
   WHERE regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g') = $1
`;

export async function findPartyByPhone(phone: string): Promise<ProbeResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) return buildProbeResult({ phone, normalized: '' }, []);
  const { rows } = await getPool().query<ProbeMatch>(FIND_BY_PHONE_SQL, [normalized]);
  return buildProbeResult({ phone, normalized }, rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// findPartyByName — case-insensitive, optional state filter
// ─────────────────────────────────────────────────────────────────────────────

const FIND_BY_NAME_SQL = `
  (SELECT 'dwh.customer_main' AS source, party_id::text AS native_id,
          first_nm, last_nm, primary_email_addr, primary_phone_e164
     FROM dwh.customer_main
    WHERE lower(first_nm) = $1 AND (lower(last_nm) = $2 OR lower(previous_last_nm) = $2)
      AND ($3::text IS NULL OR primary_state_cd = $3)
    LIMIT 50)
  UNION ALL
  (SELECT 'crm.contact', id,
          first_name, last_name, email, phone
     FROM crm.contact
    WHERE lower(first_name) = $1 AND (lower(last_name) = $2 OR lower(previous_last_name) = $2)
      AND ($3::text IS NULL OR mailing_state = $3)
    LIMIT 50)
  UNION ALL
  (SELECT 'marketing.subscriber', subscriber_id::text,
          first_name, last_name, email, phone
     FROM marketing.subscriber
    WHERE lower(first_name) = $1 AND lower(last_name) = $2
      AND ($3::text IS NULL OR state = $3)
    LIMIT 50)
  UNION ALL
  (SELECT DISTINCT ON (customer_email)
          'dealer_dms.service_record', service_id,
          customer_first_name, customer_last_name, customer_email, customer_phone
     FROM dealer_dms.service_record
    WHERE lower(customer_first_name) = $1 AND lower(customer_last_name) = $2
    LIMIT 50)
  UNION ALL
  (SELECT 'vehicle_telematics.vin_registration', vin,
          owner_first_name, owner_last_name, owner_email, owner_phone
     FROM vehicle_telematics.vin_registration
    WHERE lower(owner_first_name) = $1 AND lower(owner_last_name) = $2
      AND ($3::text IS NULL OR registration_state = $3)
    LIMIT 50)
  UNION ALL
  (SELECT 'naica_demo.intake_requests', request_id,
          first_name, last_name, email::text, phone
     FROM naica_demo.intake_requests
    WHERE lower(first_name) = $1 AND lower(last_name) = $2
      AND ($3::text IS NULL OR state = $3)
    LIMIT 50)
`;

export async function findPartyByName(
  first_name: string,
  last_name: string,
  state?: string,
): Promise<ProbeResult> {
  const f = first_name.trim().toLowerCase();
  const l = last_name.trim().toLowerCase();
  const s = state?.trim().toUpperCase() || null;
  const { rows } = await getPool().query<ProbeMatch>(FIND_BY_NAME_SQL, [f, l, s]);
  return buildProbeResult({ first_name: f, last_name: l, state: s }, rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// findPartyByVin — VIN-specific (DMS, telematics, DWH facts)
// ─────────────────────────────────────────────────────────────────────────────

interface VinResult {
  vin: string;
  telematics_owner: Record<string, unknown> | null;
  dms_records: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  service_events: Record<string, unknown>[];
  partial_failures: string[];
}

export async function findPartyByVin(vin: string): Promise<VinResult> {
  const v = vin.trim().toUpperCase();
  const pool = getPool();
  const partial_failures: string[] = [];

  const safe = async <T>(label: string, p: Promise<T>): Promise<T | null> =>
    p.catch((e) => {
      partial_failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    });

  const [tel, dms, pur, svc] = await Promise.all([
    safe(
      'vehicle_telematics.vin_registration',
      pool.query(
        `SELECT vin, owner_email, owner_first_name, owner_last_name, owner_phone,
                registration_state, vehicle_year, vehicle_make, vehicle_model,
                consent_telematics, consent_location, consent_data_sharing
           FROM vehicle_telematics.vin_registration WHERE vin = $1`,
        [v],
      ),
    ),
    safe(
      'dealer_dms.service_record',
      pool.query(
        `SELECT service_id, service_dt, dealer_id, mileage, service_type, notes,
                customer_first_name, customer_last_name, customer_email, customer_phone
           FROM dealer_dms.service_record WHERE vin = $1
           ORDER BY service_dt DESC LIMIT 20`,
        [v],
      ),
    ),
    safe(
      'dwh.fct_purchase',
      pool.query(
        `SELECT party_id::text, purchase_dt, dealer_id, vehicle_year, vehicle_make,
                vehicle_model, financing_flag, purchase_price_usd
           FROM dwh.fct_purchase WHERE vin = $1
           ORDER BY purchase_dt DESC LIMIT 20`,
        [v],
      ),
    ),
    safe(
      'dwh.fct_service_event',
      pool.query(
        `SELECT party_id::text, service_dt, dealer_id, service_type_cd, cost_usd, warranty_covered_flag
           FROM dwh.fct_service_event WHERE vin = $1
           ORDER BY service_dt DESC LIMIT 20`,
        [v],
      ),
    ),
  ]);

  return {
    vin: v,
    telematics_owner: tel?.rows[0] ?? null,
    dms_records: dms?.rows ?? [],
    purchases: pur?.rows ?? [],
    service_events: svc?.rows ?? [],
    partial_failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getParty360 — full picture for a dwh.customer_main party_id
// ─────────────────────────────────────────────────────────────────────────────

interface Party360 {
  party_id: string;
  identity: Record<string, unknown> | null;
  sources: {
    dwh: Record<string, unknown>;
    crm: Record<string, unknown>;
    marketing: Record<string, unknown>;
    dealer_dms: Record<string, unknown>;
    vehicle_telematics: Record<string, unknown>;
  };
  record_counts: Record<string, number>;
  partial_failures: string[];
}

export async function getParty360(party_id: string): Promise<Party360> {
  const pool = getPool();
  const partial_failures: string[] = [];

  const safe = async <T>(label: string, p: Promise<T>): Promise<T | null> =>
    p.catch((e) => {
      partial_failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    });

  // First pull the golden record so we have the email to stitch by.
  const customer = await safe(
    'dwh.customer_main',
    pool.query(
      `SELECT party_id::text, first_nm, last_nm, previous_last_nm, full_legal_nm,
              birth_dt, primary_email_addr, primary_phone_e164, primary_state_cd,
              primary_address_text, household_key::text,
              consent_marketing, consent_telematics, source_system_keys,
              first_seen_ts, last_updated_ts
         FROM dwh.customer_main WHERE party_id = $1`,
      [party_id],
    ),
  );
  const main = customer?.rows[0] ?? null;
  const email: string | null = (main?.primary_email_addr as string | undefined)?.toLowerCase() ?? null;

  // Fan out the rest in parallel.
  const [
    inferred,
    purchases,
    services,
    crmContact,
    crmCases,
    crmOpps,
    mktSubscriber,
    mktPrefs,
    mktSends,
    mktSuppression,
    mktLoyalty,
    dmsRecords,
    telVins,
  ] = await Promise.all([
    safe(
      'dwh.inferred_attributes',
      pool.query(`SELECT * FROM dwh.inferred_attributes WHERE party_id = $1`, [party_id]),
    ),
    safe(
      'dwh.fct_purchase',
      pool.query(
        `SELECT purchase_id, vin, vehicle_year, vehicle_make, vehicle_model,
                purchase_dt, dealer_id, financing_flag, purchase_price_usd
           FROM dwh.fct_purchase WHERE party_id = $1
           ORDER BY purchase_dt DESC LIMIT 20`,
        [party_id],
      ),
    ),
    safe(
      'dwh.fct_service_event',
      pool.query(
        `SELECT service_event_id, vin, service_dt, dealer_id, service_type_cd,
                cost_usd, warranty_covered_flag
           FROM dwh.fct_service_event WHERE party_id = $1
           ORDER BY service_dt DESC LIMIT 20`,
        [party_id],
      ),
    ),
    email
      ? safe(
          'crm.contact',
          pool.query(
            `SELECT id, account_id, first_name, last_name, email, phone, mailing_state,
                    mailing_street, mailing_city, birthdate, previous_last_name,
                    marketing_opt_in, do_not_call, created_date, last_modified_date
               FROM crm.contact WHERE lower(email) = $1 LIMIT 1`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'crm.support_case',
          pool.query(
            `SELECT c.id, c.subject, c.status, c.origin, c.priority, c.vin,
                    c.created_date, c.closed_date
               FROM crm.support_case c
               JOIN crm.contact ct ON ct.id = c.contact_id
              WHERE lower(ct.email) = $1
              ORDER BY c.created_date DESC LIMIT 20`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'crm.opportunity',
          pool.query(
            `SELECT o.id, o.name, o.stage_name, o.amount, o.close_date,
                    o.vehicle_interest, o.dealer_id, o.created_date
               FROM crm.opportunity o
               JOIN crm.contact ct ON ct.id = o.contact_id
              WHERE lower(ct.email) = $1
              ORDER BY o.created_date DESC LIMIT 20`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'marketing.subscriber',
          pool.query(
            `SELECT subscriber_id, email, first_name, last_name, phone, state,
                    external_customer_id, source_channel, enrolled_at, status
               FROM marketing.subscriber WHERE lower(email) = $1`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'marketing.subscription_preference',
          pool.query(
            `SELECT sp.channel, sp.category, sp.opted_in, sp.updated_at
               FROM marketing.subscription_preference sp
               JOIN marketing.subscriber s ON s.subscriber_id = sp.subscriber_id
              WHERE lower(s.email) = $1`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'marketing.send_history',
          pool.query(
            `SELECT sh.send_id, sh.campaign_id, sh.template_name, sh.channel,
                    sh.subject, sh.send_ts
               FROM marketing.send_history sh
               JOIN marketing.subscriber s ON s.subscriber_id = sh.subscriber_id
              WHERE lower(s.email) = $1
              ORDER BY sh.send_ts DESC LIMIT 20`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'marketing.suppression',
          pool.query(
            `SELECT sup.subscriber_id, sup.reason, sup.suppressed_at, sup.retention_required_until
               FROM marketing.suppression sup
               JOIN marketing.subscriber s ON s.subscriber_id = sup.subscriber_id
              WHERE lower(s.email) = $1`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'marketing.loyalty_member',
          pool.query(
            `SELECT lm.member_id, lm.enrollment_ts, lm.current_tier,
                    lm.points_balance, lm.lifetime_points_earned, lm.status
               FROM marketing.loyalty_member lm
               JOIN marketing.subscriber s ON s.subscriber_id = lm.subscriber_id
              WHERE lower(s.email) = $1`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'dealer_dms.service_record',
          pool.query(
            `SELECT service_id, vin, service_dt, dealer_id, mileage, service_type,
                    notes, warranty_covered, customer_first_name, customer_last_name,
                    customer_email, customer_phone
               FROM dealer_dms.service_record
              WHERE lower(customer_email) = $1
              ORDER BY service_dt DESC LIMIT 20`,
            [email],
          ),
        )
      : Promise.resolve(null),
    email
      ? safe(
          'vehicle_telematics.vin_registration',
          pool.query(
            `SELECT vin, owner_email, owner_first_name, owner_last_name, owner_phone,
                    registration_state, vehicle_year, vehicle_make, vehicle_model,
                    consent_telematics, consent_location, consent_data_sharing,
                    enrolled_at
               FROM vehicle_telematics.vin_registration
              WHERE lower(owner_email) = $1`,
            [email],
          ),
        )
      : Promise.resolve(null),
  ]);

  return {
    party_id,
    identity: main
      ? {
          first_name: main.first_nm,
          last_name: main.last_nm,
          previous_last_name: main.previous_last_nm,
          email: main.primary_email_addr,
          phone: main.primary_phone_e164,
          state: main.primary_state_cd,
          address: main.primary_address_text,
          household_key: main.household_key,
        }
      : null,
    sources: {
      dwh: {
        customer_main: main,
        inferred_attributes: inferred?.rows[0] ?? null,
        purchases: purchases?.rows ?? [],
        service_events: services?.rows ?? [],
      },
      crm: {
        contact: crmContact?.rows[0] ?? null,
        support_cases: crmCases?.rows ?? [],
        opportunities: crmOpps?.rows ?? [],
      },
      marketing: {
        subscriber: mktSubscriber?.rows[0] ?? null,
        preferences: mktPrefs?.rows ?? [],
        recent_sends: mktSends?.rows ?? [],
        suppression: mktSuppression?.rows[0] ?? null,
        loyalty: mktLoyalty?.rows[0] ?? null,
      },
      dealer_dms: {
        service_records: dmsRecords?.rows ?? [],
      },
      vehicle_telematics: {
        vin_registrations: telVins?.rows ?? [],
      },
    },
    record_counts: {
      dwh_purchases: purchases?.rows.length ?? 0,
      dwh_service_events: services?.rows.length ?? 0,
      crm_support_cases: crmCases?.rows.length ?? 0,
      crm_opportunities: crmOpps?.rows.length ?? 0,
      marketing_preferences: mktPrefs?.rows.length ?? 0,
      marketing_sends: mktSends?.rows.length ?? 0,
      dealer_dms_service_records: dmsRecords?.rows.length ?? 0,
      vehicle_telematics_vins: telVins?.rows.length ?? 0,
    },
    partial_failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// decodeInferredAttributes — pull + decode coded fields
// ─────────────────────────────────────────────────────────────────────────────

// Maps inferred_attributes column names to cipher_legend.json field names.
// (Cipher legend uses e.g. `income_code`, table uses `income_band_cd`.)
const CODE_COLUMN_TO_LEGEND_FIELD: Record<string, string> = {
  income_band_cd: 'income_code',
  marketing_seg_cd: 'marketing_segment_code',
  vehicle_segment_cd: 'vehicle_segment_code',
  age_range_cd: 'age_range_code',
  education_cd: 'education_code',
  occupation_cd: 'occupation_code',
};

interface DecodedAttributes {
  party_id: string;
  raw: Record<string, string | number | null>;
  decoded: Record<string, string>;
  unknown_codes: string[];
  ml_scores: Record<string, number | null>;
  model_version: string | null;
}

export async function decodeInferredAttributes(party_id: string): Promise<DecodedAttributes | { error: string }> {
  const { rows } = await getPool().query(
    `SELECT income_band_cd, marketing_seg_cd, vehicle_segment_cd, age_range_cd,
            education_cd, occupation_cd,
            churn_score, ltv_estimate_usd, propensity_to_buy_score,
            inferred_ts, model_version
       FROM dwh.inferred_attributes WHERE party_id = $1 LIMIT 1`,
    [party_id],
  );
  if (rows.length === 0) {
    return { error: `No inferred_attributes row for party_id ${party_id}` };
  }
  const row = rows[0] as Record<string, string | number | null>;

  const raw: Record<string, string | number | null> = {};
  const decoded: Record<string, string> = {};
  const unknown_codes: string[] = [];

  for (const [col, legendField] of Object.entries(CODE_COLUMN_TO_LEGEND_FIELD)) {
    const code = row[col];
    raw[col] = code;
    if (code == null) continue;
    const value = decodeField(legendField, String(code));
    if (value) decoded[col] = value;
    else unknown_codes.push(`${col}=${code}`);
  }

  return {
    party_id,
    raw,
    decoded,
    unknown_codes,
    ml_scores: {
      churn_score: (row.churn_score as number | null) ?? null,
      ltv_estimate_usd: (row.ltv_estimate_usd as number | null) ?? null,
      propensity_to_buy_score: (row.propensity_to_buy_score as number | null) ?? null,
    },
    model_version: (row.model_version as string | null) ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// listIntakeRequests — query the form-submission table
// ─────────────────────────────────────────────────────────────────────────────

interface IntakeListResult {
  filter_status: string | null;
  total_returned: number;
  requests: Record<string, unknown>[];
}

export async function listIntakeRequests(
  status?: string,
  limit?: number,
): Promise<IntakeListResult> {
  const cap = Math.min(Math.max(limit ?? 25, 1), 100);
  const filter = status?.trim() || null;
  const { rows } = await getPool().query(
    `SELECT request_id, request_types, requester,
            first_name, last_name, email::text AS email, phone, state,
            delivery, status, deadline_at, created_at
       FROM naica_demo.intake_requests
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY created_at DESC
      LIMIT $2`,
    [filter, cap],
  );
  return {
    filter_status: filter,
    total_returned: rows.length,
    requests: rows,
  };
}
