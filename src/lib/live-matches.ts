// Server-side synthesizer that turns live source-system probe results into
// the same MatchData / RecordData shape the UI's static-JSON path produces.
// Used by /api/requests/[id]/matches to back intake-form-created requests
// (REQ-1xxxxx) that aren't pre-materialized in src/data/*.json.
//
// Reuses the same probes the chat agent's tools use (findPartyByEmail /
// findPartyByName) so the data is consistent with what Claude sees when it
// calls those tools directly.

import { findPartyByEmail, findPartyByName, decodeInferredAttributes } from '@/lib/db-queries';
import { getComplianceRules } from '@/lib/data';
import type { MatchData, RecordData } from '@/types';

export interface IntakeForLiveMatch {
  request_id: string;
  request_type: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  state: string;
}

interface ProbeMatch {
  source: string;
  native_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

// SQL schema/table → values used by the UI's data_source field.
// Aligned with entries in src/lib/data-sources.ts so SystemBadge and
// SystemQueryStrip render with the right system_type / friendly_name.
const SOURCE_TO_DATA_SOURCE: Record<string, string> = {
  'dwh.customer_main': 'DataWarehouse',
  'crm.contact': 'SalesCRM',
  'marketing.subscriber': 'Marketing',
  'dealer_dms.service_record': 'DealerRecords',
  'vehicle_telematics.vin_registration': 'VehicleServices',
};

// SQL schema/table → values used by the UI's record_type field.
// Aligned with the record_types compliance_rules.json knows about so
// the disposition preview can find a matching rule.
const SOURCE_TO_RECORD_TYPE: Record<string, string> = {
  'dwh.customer_main': 'consumer_profile',
  'crm.contact': 'crm_record',
  'marketing.subscriber': 'marketing_record',
  'dealer_dms.service_record': 'service_record',
  'vehicle_telematics.vin_registration': 'vehicle_record',
};

// Local copy of CODE_COLUMN_TO_LEGEND_FIELD from db-queries.ts. Duplicated
// to keep that constant private to the queries layer; this map is small
// and stable. coded_fields needs *legend field* keys (e.g. `income_code`)
// because DecodedDataTable calls decodeField(fieldName, code).
const CODE_COLUMN_TO_LEGEND_FIELD: Record<string, string> = {
  income_band_cd: 'income_code',
  marketing_seg_cd: 'marketing_segment_code',
  vehicle_segment_cd: 'vehicle_segment_code',
  age_range_cd: 'age_range_code',
  education_cd: 'education_code',
  occupation_cd: 'occupation_code',
};

function normalizePhoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

function scoreFields(probe: ProbeMatch, intake: IntakeForLiveMatch) {
  const probeFirst = (probe.first_name ?? '').trim().toLowerCase();
  const probeLast = (probe.last_name ?? '').trim().toLowerCase();
  const intakeFirst = intake.first_name.trim().toLowerCase();
  const intakeLast = intake.last_name.trim().toLowerCase();
  const nameMatch = probeFirst === intakeFirst && probeLast === intakeLast;

  const emailMatch =
    !!probe.email &&
    !!intake.email &&
    probe.email.trim().toLowerCase() === intake.email.trim().toLowerCase();

  const intakePhone = normalizePhoneDigits(intake.phone);
  const probePhone = normalizePhoneDigits(probe.phone);
  const phoneMatch = intakePhone.length > 0 && intakePhone === probePhone;

  // address always 0 — probes don't return address. Caps perfect score at 4.
  return {
    name: nameMatch ? 1 : 0,
    email: emailMatch ? 1 : 0,
    phone: phoneMatch ? 1 : 0,
    state: 1,
    address: 0,
  };
}

export interface BuildLiveMatchesResult {
  matches: MatchData[];
  records: RecordData[];
}

export async function buildLiveMatchesForRequest(
  intake: IntakeForLiveMatch,
): Promise<BuildLiveMatchesResult> {
  const [byEmail, byName] = await Promise.all([
    findPartyByEmail(intake.email),
    findPartyByName(intake.first_name, intake.last_name, intake.state),
  ]);

  // Dedupe across the two probes by source+native_id; skip the intake row
  // itself (it's the request, not a downstream hit).
  const seen = new Set<string>();
  const probes: ProbeMatch[] = [];
  for (const p of [...byEmail.matches, ...byName.matches]) {
    if (p.source === 'naica_demo.intake_requests') continue;
    const key = `${p.source}:${p.native_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    probes.push(p);
  }

  // Decode inferred_attributes for each unique DWH party_id, packed into the
  // dwh.customer_main record's coded_fields.
  const partyIds = Array.from(
    new Set(
      probes
        .filter((p) => p.source === 'dwh.customer_main')
        .map((p) => p.native_id),
    ),
  );
  const codedByPartyId = new Map<string, Record<string, string>>();
  await Promise.all(
    partyIds.map(async (pid) => {
      const result = await decodeInferredAttributes(pid).catch(() => null);
      if (!result || 'error' in result) {
        codedByPartyId.set(pid, {});
        return;
      }
      const coded: Record<string, string> = {};
      for (const [col, code] of Object.entries(result.raw)) {
        if (code == null) continue;
        const legendField = CODE_COLUMN_TO_LEGEND_FIELD[col];
        if (!legendField) continue;
        coded[legendField] = String(code);
      }
      codedByPartyId.set(pid, coded);
    }),
  );

  // If multiple distinct DWH party_ids surfaced, every match is ambiguous.
  const ambiguous = partyIds.length > 1;
  const ambiguousReasoning = ambiguous
    ? `Identity probes returned ${partyIds.length} distinct DWH party_ids (${partyIds.join(', ')}). Manual disambiguation recommended before disposition.`
    : null;

  // Disposition preview: look up rules for this state/type, build a quick
  // record_type → rule map. Synthesized matches set disposition_source='preview'
  // so it's clear in the audit log this came from rule projection, not the
  // approved disposition planner.
  const rules = getComplianceRules(intake.state, intake.request_type);
  const dispositionByRecordType = new Map<string, string>();
  if (rules?.disposition_rules) {
    for (const r of rules.disposition_rules) {
      dispositionByRecordType.set(r.record_type, r.disposition);
    }
  }

  const records: RecordData[] = [];
  const matches: MatchData[] = [];
  const nowIso = new Date().toISOString();

  for (const probe of probes) {
    const dataSource = SOURCE_TO_DATA_SOURCE[probe.source] ?? probe.source;
    const recordType = SOURCE_TO_RECORD_TYPE[probe.source] ?? 'other_record';
    const recordId = `${probe.source}:${probe.native_id}`;
    const codedFields =
      probe.source === 'dwh.customer_main'
        ? codedByPartyId.get(probe.native_id) ?? {}
        : {};

    records.push({
      id: recordId,
      data_source: dataSource,
      first_name: probe.first_name ?? '',
      last_name: probe.last_name ?? '',
      email: probe.email,
      phone: probe.phone,
      state: intake.state,
      address: null,
      record_type: recordType,
      coded_fields: codedFields,
      raw_data: probe as unknown as Record<string, unknown>,
    });

    const fieldScores = scoreFields(probe, intake);
    const matchScore =
      fieldScores.name +
      fieldScores.email +
      fieldScores.phone +
      fieldScores.state +
      fieldScores.address;

    const decision = ambiguous
      ? 'ambiguous'
      : matchScore >= 3
        ? 'auto_included'
        : 'review';

    const previewDisposition = dispositionByRecordType.get(recordType) ?? null;

    matches.push({
      id: `live-${recordId}`,
      request_id: intake.request_id,
      record_id: recordId,
      match_score: matchScore,
      field_scores: fieldScores,
      match_decision: decision,
      disposition: previewDisposition,
      disposition_source: previewDisposition ? 'preview' : null,
      agent_reasoning: ambiguousReasoning,
      human_notes: null,
      created_at: nowIso,
    });
  }

  return { matches, records };
}
