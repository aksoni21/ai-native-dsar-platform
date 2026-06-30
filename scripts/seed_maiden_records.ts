// Seed the maiden-name records (Maria Sanchez + Maria Salazar) into the live
// pg source-system tables (dwh.customer_main, crm.contact,
// dealer_dms.service_record). These were previously demo-only seeds inside
// src/data/records.json that the cascade-merge backdoor scanned directly.
// With this script run, find_party_by_name(maria, sanchez, CA) and the
// Salazar variant return rows naturally — no backdoor needed.
//
// Idempotent — uses INSERT … ON CONFLICT DO UPDATE so re-running is safe.
//
//   PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsx scripts/seed_maiden_records.ts

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { Client } from 'pg';

const SETS = [
  {
    label: 'Sanchez',
    party_id: 'b2000001-0000-4000-b000-000000000001',
    household_key: 'c3000001-0000-4000-c000-000000000001',
    first: 'Maria',
    last: 'Sanchez',
    email: 'maria.sanchez.com',
    phone_e164: '+14155550101',
    phone_local: '415-555-0101',
    state: 'CA',
    address: '918 Larkspur Lane, San Mateo, CA 94402',
    crm_id: 'CRM-MARIA-SANCHEZ',
    crm_account: 'ACCT-MARIA-SANCHEZ',
    dms_service_id: 'DMS-MC-SAN-001',
    dms_vin: 'JTACME19SAN000001',
    dms_dealer: 'DLR-DALY-CITY-02',
    dms_service_dt: '2020-11-30',
    dms_service_type: '15k_service',
    dms_mileage: 14982,
    first_seen: '2018-06-14',
    last_updated: '2022-08-14',
  },
  {
    label: 'Salazar',
    party_id: 'b2000002-0000-4000-b000-000000000002',
    household_key: 'c3000002-0000-4000-c000-000000000002',
    first: 'Maria',
    last: 'Salazar',
    email: 'maria.salazar.com',
    phone_e164: '+14155550101',
    phone_local: '415-555-0101',
    state: 'CA',
    address: '318 Crescent Way, San Mateo, CA 94402',
    crm_id: 'CRM-MARIA-SALAZAR',
    crm_account: 'ACCT-MARIA-SALAZAR',
    dms_service_id: 'DMS-MC-SAL-001',
    dms_vin: 'JTACME20SAL000001',
    dms_dealer: 'DLR-BURLINGAME-01',
    dms_service_dt: '2021-04-22',
    dms_service_type: '30k_service',
    dms_mileage: 28411,
    first_seen: '2019-04-01',
    last_updated: '2022-08-14',
  },
];

async function main() {
  const url = process.env.DATABASE_URL_FOR_ALEMBIC || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL_FOR_ALEMBIC / DATABASE_URL not set');
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  try {
    for (const r of SETS) {
      // crm.account — parent household for the maiden-name CRM contact
      await c.query(
        `INSERT INTO crm.account
           (id, name, account_type, parent_id, billing_state, billing_street, billing_city,
            created_date, last_modified_date)
         VALUES ($1,$2,'Household',NULL,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           billing_state = EXCLUDED.billing_state,
           last_modified_date = EXCLUDED.last_modified_date`,
        [
          r.crm_account,
          `${r.last} Household`,
          r.state,
          r.address.split(',')[0],
          'San Mateo',
          r.first_seen,
          r.last_updated,
        ],
      );

      // dwh.customer_main — pre-marriage master profile
      await c.query(
        `INSERT INTO dwh.customer_main
           (party_id, first_nm, last_nm, previous_last_nm, full_legal_nm, birth_dt,
            primary_email_addr, primary_phone_e164, primary_state_cd, primary_address_text,
            household_key, consent_marketing, consent_telematics,
            source_system_keys, first_seen_ts, last_updated_ts)
         VALUES ($1,$2,$3,NULL,$4,'1985-03-12',$5,$6,$7,$8,$9,true,false,$10::jsonb,$11,$12)
         ON CONFLICT (party_id) DO UPDATE SET
           first_nm = EXCLUDED.first_nm,
           last_nm = EXCLUDED.last_nm,
           primary_email_addr = EXCLUDED.primary_email_addr,
           primary_phone_e164 = EXCLUDED.primary_phone_e164,
           primary_state_cd = EXCLUDED.primary_state_cd,
           primary_address_text = EXCLUDED.primary_address_text,
           source_system_keys = EXCLUDED.source_system_keys,
           last_updated_ts = EXCLUDED.last_updated_ts`,
        [
          r.party_id,
          r.first,
          r.last,
          `${r.first} ${r.last}`,
          r.email,
          r.phone_e164,
          r.state,
          r.address,
          r.household_key,
          JSON.stringify({ crm: r.crm_id, dms: r.dms_service_id }),
          r.first_seen,
          r.last_updated,
        ],
      );

      // crm.contact — pre-marriage CRM contact
      await c.query(
        `INSERT INTO crm.contact
           (id, account_id, first_name, last_name, email, phone, mailing_state, mailing_street, mailing_city,
            birthdate, previous_last_name, marketing_opt_in, do_not_call, created_date, last_modified_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'1985-03-12',NULL,true,false,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           mailing_state = EXCLUDED.mailing_state,
           last_modified_date = EXCLUDED.last_modified_date`,
        [
          r.crm_id,
          r.crm_account,
          r.first,
          r.last,
          r.email,
          r.phone_local,
          r.state,
          r.address.split(',')[0],
          'San Mateo',
          r.first_seen,
          r.last_updated,
        ],
      );

      // dealer_dms.service_record — pre-marriage dealership service visit
      await c.query(
        `INSERT INTO dealer_dms.service_record
           (service_id, vin, customer_email, customer_phone, customer_first_name, customer_last_name,
            service_dt, dealer_id, mileage, service_type, notes, warranty_covered, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL,true,$11)
         ON CONFLICT (service_id) DO UPDATE SET
           customer_email = EXCLUDED.customer_email,
           customer_first_name = EXCLUDED.customer_first_name,
           customer_last_name = EXCLUDED.customer_last_name,
           service_dt = EXCLUDED.service_dt,
           dealer_id = EXCLUDED.dealer_id`,
        [
          r.dms_service_id,
          r.dms_vin,
          r.email,
          r.phone_local,
          r.first,
          r.last,
          r.dms_service_dt,
          r.dms_dealer,
          r.dms_mileage,
          r.dms_service_type,
          r.last_updated,
        ],
      );

      console.log(`Seeded ${r.label}: dwh=${r.party_id} crm=${r.crm_id} dms=${r.dms_service_id}`);
    }

    // Verify
    for (const r of SETS) {
      const probe = await c.query(
        `SELECT 'dwh' AS src, party_id::text AS id FROM dwh.customer_main WHERE lower(first_nm)='maria' AND lower(last_nm)=$1
         UNION ALL
         SELECT 'crm', id FROM crm.contact WHERE lower(first_name)='maria' AND lower(last_name)=$1
         UNION ALL
         SELECT 'dms', service_id FROM dealer_dms.service_record WHERE lower(customer_first_name)='maria' AND lower(customer_last_name)=$1`,
        [r.last.toLowerCase()],
      );
      console.log(`Verify ${r.label}: ${probe.rows.length} hits — ${probe.rows.map((x) => `${x.src}:${x.id}`).join(', ')}`);
    }
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
