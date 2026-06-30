/**
 * One-shot rename: REQ-VIN-001 consumer "John Brown" → "Mike Jackson".
 *
 * Surgically scoped — does NOT touch REQ-016's two John Browns
 * (different person, namesake-collision scenario).
 *
 * Idempotent: re-running after a successful rename is a no-op.
 *
 * Usage: npx tsx scripts/rename_orphan_consumer.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'src/data');
const OLD = { first: 'John', last: 'Brown', email: 'john.brown.com', full: 'John Brown' };
const NEW = { first: 'Mike', last: 'Jackson', email: 'mike.jackson.com', full: 'Mike Jackson' };

function load(name: string): unknown {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}
function save(name: string, data: unknown): void {
  writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2) + '\n');
}

// ─── requests.json ───────────────────────────────────────────────────────
{
  const reqs = load('requests.json') as Array<Record<string, unknown>>;
  const target = reqs.find((r) => r.id === 'REQ-VIN-001');
  if (target) {
    target.consumer_name = NEW.full;
    target.consumer_email = NEW.email;
    if (typeof target.demo_scenario === 'string') {
      target.demo_scenario = target.demo_scenario.replaceAll(OLD.full, NEW.full);
    }
    save('requests.json', reqs);
    console.log('requests.json — REQ-VIN-001 renamed');
  }
}

// ─── records.json ─ REC-VIN-001..005 only (NOT REC-VIN-CAND-001 = Kenji) ──
{
  const recs = load('records.json') as Array<Record<string, unknown>>;
  const REC_RE = /^REC-VIN-\d+$/;
  let n = 0;
  for (const r of recs) {
    if (typeof r.id === 'string' && REC_RE.test(r.id)) {
      r.first_name = NEW.first;
      r.last_name = NEW.last;
      r.email = NEW.email;
      n++;
    }
  }
  save('records.json', recs);
  console.log(`records.json — ${n} REC-VIN-* records renamed`);
}

// ─── vin_keyed_records.json ─ only the WAUZZZ ownership row ──────────────
{
  const vinKeyed = load('vin_keyed_records.json') as { ownerships: Array<Record<string, unknown>> };
  let n = 0;
  for (const o of vinKeyed.ownerships) {
    if (o.consumer_name === OLD.full && o.vin === 'WAUZZZ123XY456789') {
      o.consumer_name = NEW.full;
      n++;
    }
  }
  save('vin_keyed_records.json', vinKeyed);
  console.log(`vin_keyed_records.json — ${n} ownership row(s) renamed`);
}

// ─── vin_demo_records.json ─ entire file is REQ-VIN-001, walk + replace ──
{
  const blob = readFileSync(join(DATA_DIR, 'vin_demo_records.json'), 'utf8');
  const next = blob
    .replaceAll(OLD.email, NEW.email)
    .replaceAll(`"first_name": "${OLD.first}"`, `"first_name": "${NEW.first}"`)
    .replaceAll(`"last_name": "${OLD.last}"`, `"last_name": "${NEW.last}"`)
    .replaceAll(OLD.full, NEW.full);
  if (next !== blob) {
    writeFileSync(join(DATA_DIR, 'vin_demo_records.json'), next);
    console.log('vin_demo_records.json — rewritten');
  } else {
    console.log('vin_demo_records.json — no changes (already renamed?)');
  }
}

console.log('\ndone.');
