// Auto-seeds source-system rows for a freshly submitted intake request so
// the DSAR pipeline has something to match on when the user clicks through
// to the demo. Mirrors the manual seed pattern documented in
// docs/seed_data_edge_cases.md, but driven by the requestTypes the consumer
// picked on the form:
//
//   limit_sensitive → Karen Lee (coded fields, 8-field inferred_attributes)
//   delete          → David Brown (CAN-SPAM suppression-retention row)
//   opt_out         → James Williams (consent flags off, audit-rich)
//   correct         → Sofia Rodriguez (previous_last_name + marketing under old)
//   know / portab.  → Maria Chen (clean cross-system, no twists)
//
// Server-side only. No-ops (returns shape='already_seeded') if a row with
// the same primary email already lives in dwh.customer_main, so resubmitting
// the form doesn't pile on duplicates.

import type { PoolClient } from 'pg';
import { getPool } from '@/lib/db';

export type CaseShape =
  | 'happy_path'
  | 'coded_fields'
  | 'can_spam'
  | 'audit_trail'
  | 'maiden_name'
  | 'already_seeded';

export interface SeedPayload {
  requestTypes: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  state: string;
}

export interface SeedResult {
  shape: CaseShape;
  party_id: string | null;
}

export function pickCaseShape(types: string[]): Exclude<CaseShape, 'already_seeded'> {
  if (types.includes('limit_sensitive')) return 'coded_fields';
  if (types.includes('delete')) return 'can_spam';
  if (types.includes('opt_out')) return 'audit_trail';
  if (types.includes('correct')) return 'maiden_name';
  return 'happy_path';
}

const PREVIOUS_LAST_NAMES = ['Rodriguez', 'Patel', 'Nguyen', 'Kim', 'Garcia'];

function rid(prefix: string, n = 6): string {
  const s = Math.floor(Math.random() * Math.pow(10, n))
    .toString()
    .padStart(n, '0');
  return `${prefix}${s}`;
}

function toE164(phone: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '+1' + Math.floor(2_000_000_000 + Math.random() * 7_999_999_999).toString();
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return '+1' + ten.padStart(10, '0').slice(-10);
}

function formatPretty(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

function formatDotted(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : e164;
}

function digitsOnly(e164: string): string {
  return e164.replace(/\D/g, '').replace(/^1/, '');
}

export async function seedSourceSystemsForRequest(
  payload: SeedPayload,
): Promise<SeedResult> {
  const client = await getPool().connect();
  try {
    // Idempotency: skip if this consumer is already in the warehouse.
    const existing = await client.query<{ party_id: string }>(
      `SELECT party_id FROM dwh.customer_main
        WHERE primary_email_addr ILIKE $1
        LIMIT 1`,
      [payload.email],
    );
    if (existing.rows.length > 0) {
      return { shape: 'already_seeded', party_id: existing.rows[0].party_id };
    }

    const shape = pickCaseShape(payload.requestTypes);
    await client.query('BEGIN');
    const partyId = await runSeed(client, payload, shape);
    await client.query('COMMIT');
    return { shape, party_id: partyId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function runSeed(
  client: PoolClient,
  payload: SeedPayload,
  shape: Exclude<CaseShape, 'already_seeded'>,
): Promise<string> {
  const first = payload.firstName.trim();
  const last = payload.lastName.trim();
  const email = payload.email.trim();
  const state = payload.state;
  const phoneE164 = toE164(payload.phone);

  const accountId = rid('001H', 6);
  const contactId = rid('003C', 6);
  const vin = '1HGBH41JXMN' + rid('', 6);
  const dmsId = 'DMS-' + rid('', 4);
  const invoiceId = 'INV-' + rid('', 4);
  const loyaltyId = 'NX-' + rid('', 6);

  // Maiden-name twist (Sofia Rodriguez shape) — set previous_last_name and
  // also create a marketing row under the old name.
  const isMaidenName = shape === 'maiden_name';
  const previousLast = isMaidenName
    ? PREVIOUS_LAST_NAMES[Math.floor(Math.random() * PREVIOUS_LAST_NAMES.length)]
    : null;
  const oldEmail = isMaidenName
    ? email.replace(/@/, `+${(previousLast ?? 'old').toLowerCase()}@`)
    : null;

  // Opt-out twist (James Williams shape) — consent off, marketing suppressed.
  const isOptOut = shape === 'audit_trail';

  // Delete + CAN-SPAM (David Brown shape) — marketing.suppression with
  // retention requirement; subscriber is suppressed.
  const isDelete = shape === 'can_spam';

  // ── DWH golden record
  const partyResult = await client.query<{ party_id: string }>(
    `INSERT INTO dwh.customer_main (
        first_nm, last_nm, previous_last_nm, full_legal_nm,
        primary_email_addr, primary_phone_e164, primary_state_cd,
        primary_address_text,
        consent_marketing, consent_telematics, source_system_keys
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING party_id`,
    [
      first,
      last,
      previousLast,
      `${first} ${last}`,
      email,
      phoneE164,
      state,
      `Auto-seeded · ${state}`,
      !(isOptOut || isDelete),
      !(isOptOut || isDelete),
      JSON.stringify({ crm: contactId, dealer_dms_email: email }),
    ],
  );
  const partyId = partyResult.rows[0].party_id;

  // ── DWH inferred_attributes — every shape gets a row, but coded_fields
  // gets the rich 8-field decode-showcase version. Others get a sparser one.
  if (shape === 'coded_fields') {
    await client.query(
      `INSERT INTO dwh.inferred_attributes
         (party_id, income_band_cd, marketing_seg_cd, vehicle_segment_cd,
          age_range_cd, education_cd, occupation_cd,
          churn_score, ltv_estimate_usd, propensity_to_buy_score, model_version)
       VALUES ($1,'G','URB-P','SUV-M','4','5','TECH',
               0.0821, 142500.00, 0.7350, 'v2.4.1')`,
      [partyId],
    );
  } else {
    await client.query(
      `INSERT INTO dwh.inferred_attributes
         (party_id, income_band_cd, age_range_cd, education_cd,
          churn_score, ltv_estimate_usd, model_version)
       VALUES ($1,'D','3','4', 0.1500, 78400.00, 'v2.4.1')`,
      [partyId],
    );
  }

  // ── DWH purchase + service event
  await client.query(
    `INSERT INTO dwh.fct_purchase
       (party_id, vin, vehicle_year, vehicle_make, vehicle_model,
        purchase_dt, dealer_id, financing_flag, purchase_price_usd)
     VALUES ($1,$2,2023,'Example Motors','Rogue',
             DATE '2023-04-22','D-CA-0142', true, 36750.00)`,
    [partyId, vin],
  );
  await client.query(
    `INSERT INTO dwh.fct_service_event
       (party_id, vin, service_dt, dealer_id, service_type_cd, cost_usd, warranty_covered_flag)
     VALUES ($1,$2,DATE '2024-11-08','D-CA-0142','OC',89.50,false)`,
    [partyId, vin],
  );

  // ── CRM account + contact
  await client.query(
    `INSERT INTO crm.account (id, name, account_type, billing_state)
     VALUES ($1,$2,'Individual',$3)`,
    [accountId, `${first} ${last}`, state],
  );
  await client.query(
    `INSERT INTO crm.contact
       (id, account_id, first_name, last_name, email, phone,
        mailing_state, previous_last_name, marketing_opt_in, do_not_call)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      contactId,
      accountId,
      first,
      last,
      email,
      formatPretty(phoneE164),
      state,
      previousLast,
      !(isOptOut || isDelete),
      isOptOut,
    ],
  );

  // ── Marketing subscriber + prefs + send history + loyalty
  const subStatus = isDelete ? 'suppressed' : isOptOut ? 'unsubscribed' : 'active';
  const subscriberRes = await client.query<{ subscriber_id: number }>(
    `INSERT INTO marketing.subscriber
       (email, first_name, last_name, phone, state,
        external_customer_id, source_channel, status)
     VALUES ($1,$2,$3,$4,$5,$6,'crm_sync',$7)
     RETURNING subscriber_id`,
    [email, first, last, digitsOnly(phoneE164), state, contactId, subStatus],
  );
  const subscriberId = subscriberRes.rows[0].subscriber_id;

  await client.query(
    `INSERT INTO marketing.subscription_preference (subscriber_id, channel, category, opted_in) VALUES
        ($1,'email','marketing',$2),
        ($1,'email','service_reminder',true),
        ($1,'email','recall',true)`,
    [subscriberId, !(isOptOut || isDelete)],
  );

  await client.query(
    `INSERT INTO marketing.send_history
       (subscriber_id, campaign_id, template_name, channel, subject, send_ts)
     VALUES ($1,'CMP-2026-Q2-NEWS','q2_newsletter','email',
             'Spring driving season is here', now() - interval '14 days')`,
    [subscriberId],
  );

  await client.query(
    `INSERT INTO marketing.loyalty_member
       (member_id, subscriber_id, current_tier, points_balance, lifetime_points_earned, status)
     VALUES ($1,$2,'gold',9820,28740,$3)`,
    [loyaltyId, subscriberId, isDelete ? 'inactive' : 'active'],
  );

  // ── CAN-SPAM evidence row (only for delete shape) — five-year retention.
  if (isDelete) {
    await client.query(
      `INSERT INTO marketing.suppression
         (subscriber_id, reason, suppressed_at, retention_required_until)
       VALUES ($1,'spam_complaint', now() - interval '6 months',
               now() + interval '4 years 6 months')`,
      [subscriberId],
    );
  }

  // ── Maiden-name shape: extra marketing row under the OLD email/last name.
  if (isMaidenName && oldEmail && previousLast) {
    await client.query(
      `INSERT INTO marketing.subscriber
         (email, first_name, last_name, phone, state,
          source_channel, status)
       VALUES ($1,$2,$3,$4,$5,'web_signup','active')`,
      [oldEmail, first, previousLast, digitsOnly(phoneE164), state],
    );
  }

  // ── Dealer DMS service + invoice (phone in dotted format on purpose so
  // the matcher exercises its phone-normalization path).
  await client.query(
    `INSERT INTO dealer_dms.service_record
       (service_id, vin, customer_email, customer_phone,
        customer_first_name, customer_last_name,
        service_dt, dealer_id, mileage, service_type, notes, warranty_covered)
     VALUES ($1,$2,$3,$4,$5,$6,DATE '2024-11-08','D-CA-0142',18420,
             'oil_change','Oil change + tire rotation', false)`,
    [dmsId, vin, email, formatDotted(phoneE164), first, last],
  );
  await client.query(
    `INSERT INTO dealer_dms.repair_invoice
       (invoice_id, service_id, vin, line_items,
        parts_total_usd, labor_total_usd, total_usd, paid, invoice_dt)
     VALUES ($1,$2,$3,
             $4::jsonb,
             57.50, 32.00, 89.50, true, DATE '2024-11-08')`,
    [
      invoiceId,
      dmsId,
      vin,
      JSON.stringify([
        { sku: 'OIL-5W30', desc: 'Synthetic oil 5qt', qty: 1, unit: 42.0 },
        { sku: 'FLT-ENG', desc: 'Engine filter', qty: 1, unit: 15.5 },
      ]),
    ],
  );

  // ── Telematics registration + one trip event.
  await client.query(
    `INSERT INTO vehicle_telematics.vin_registration
       (vin, owner_email, owner_first_name, owner_last_name, owner_phone,
        registration_state, vehicle_year, vehicle_make, vehicle_model,
        consent_telematics, consent_location, consent_data_sharing)
     VALUES ($1,$2,$3,$4,$5,$6,2023,'Example Motors','Rogue',$7,$8,false)`,
    [
      vin,
      email,
      first,
      last,
      phoneE164,
      state,
      !(isOptOut || isDelete),
      !(isOptOut || isDelete),
    ],
  );
  await client.query(
    `INSERT INTO vehicle_telematics.trip_event
       (vin, trip_start_ts, trip_end_ts,
        start_lat, start_lon, end_lat, end_lon,
        distance_miles, max_speed_mph, hard_brake_count)
     VALUES ($1,
             now() - interval '5 days' - interval '38 minutes',
             now() - interval '5 days',
             37.785834, -122.406417, 37.441880, -122.143020,
             34.12, 73, 2)`,
    [vin],
  );

  return partyId;
}
