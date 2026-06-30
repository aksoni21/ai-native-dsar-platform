import assert from 'node:assert/strict';
import test from 'node:test';

import { PostgresPrivacyConnector } from '../connectors/examples/postgres/postgres-connector.ts';

const rows = [
  {
    id: 'rec-1',
    first_name: 'Maria',
    last_name: 'Chen',
    email: 'maria.chen@example.com',
    phone: '415-555-0101',
  },
  {
    id: 'rec-2',
    first_name: 'Mara',
    last_name: 'Chen',
    email: 'mara.review@example.com',
    phone: '415-555-0199',
  },
];

test('PostgresPrivacyConnector returns health without exposing data', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const connector = new PostgresPrivacyConnector(async (sql, params) => {
    calls.push({ sql, params });
    return [{ ok: 1 }];
  });

  const health = await connector.health();

  assert.equal(health.connectorId, 'postgres-example');
  assert.equal(health.ok, true);
  assert.match(health.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(calls[0].sql, 'select 1 as ok');
  assert.deepEqual(calls[0].params, []);
});

test('PostgresPrivacyConnector normalizes search results and confidence', async () => {
  const connector = new PostgresPrivacyConnector(async (_sql, params) => {
    assert.deepEqual(params, ['maria.chen@example.com', null, 'Chen']);
    return rows;
  });

  const candidates = await connector.searchSubject({
    email: 'maria.chen@example.com',
    lastName: 'Chen',
  });

  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates[0], {
    connectorId: 'postgres-example',
    sourceSystem: 'Example Postgres Source System',
    sourceRecordId: 'rec-1',
    subjectDisplayName: 'Maria Chen',
    matchedIdentifiers: ['email', 'last_name'],
    confidence: 0.95,
    includeRecommendation: 'include',
    reasoning: 'Candidate returned by the Postgres connector using deterministic identifier search.',
  });
  assert.equal(candidates[1].includeRecommendation, 'review');
  assert.equal(candidates[1].confidence, 0.55);
});

test('PostgresPrivacyConnector retrieves one normalized record', async () => {
  const connector = new PostgresPrivacyConnector(async (sql, params) => {
    assert.equal(sql, 'select * from privacy_subject_records where id = $1 limit 1');
    assert.deepEqual(params, ['rec-1']);
    return [rows[0]];
  });

  const record = await connector.getRecord('rec-1');

  assert.equal(record?.connectorId, 'postgres-example');
  assert.equal(record?.sourceRecordId, 'rec-1');
  assert.deepEqual(record?.categories, ['customer_profile']);
  assert.equal(record?.attributes.email, 'maria.chen@example.com');
});

test('PostgresPrivacyConnector returns null for missing records', async () => {
  const connector = new PostgresPrivacyConnector(async () => []);

  await assert.doesNotReject(async () => {
    const record = await connector.getRecord('missing');
    assert.equal(record, null);
  });
});
