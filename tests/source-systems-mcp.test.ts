import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrivacyConnector } from '../connectors/sdk/src/types.ts';
import { SourceSystemsMcpServer } from '../mcp/source-systems/src/server.ts';

function connector(id: string, confidence: number): PrivacyConnector {
  return {
    id,
    displayName: `${id} Connector`,
    systemType: 'crm',
    capabilities: ['search', 'get_record', 'explain'],
    async health() {
      return {
        connectorId: id,
        ok: true,
        checkedAt: '2026-01-01T00:00:00.000Z',
      };
    },
    async searchSubject() {
      return [
        {
          connectorId: id,
          sourceSystem: `${id} Connector`,
          sourceRecordId: `${id}-record`,
          matchedIdentifiers: ['email'],
          confidence,
          includeRecommendation: confidence > 0.9 ? 'include' : 'review',
          reasoning: 'Fixture candidate.',
        },
      ];
    },
    async getRecord(sourceRecordId) {
      return {
        connectorId: id,
        sourceSystem: `${id} Connector`,
        sourceRecordId,
        categories: ['customer_profile'],
        attributes: { id: sourceRecordId },
      };
    },
    async explainRecord(sourceRecordId) {
      return {
        connectorId: id,
        sourceSystem: `${id} Connector`,
        sourceRecordId,
        queryEvidence: ['fixture lookup'],
        normalizationNotes: [],
        dataQualityFlags: [],
      };
    },
  };
}

test('SourceSystemsMcpServer searches all connectors and sorts by confidence', async () => {
  const server = new SourceSystemsMcpServer({
    connectors: [connector('low', 0.4), connector('high', 0.97)],
  });

  const results = await server.searchSubject({ email: 'maria.chen@example.com' });

  assert.deepEqual(
    results.map((result) => result.connectorId),
    ['high', 'low'],
  );
});

test('SourceSystemsMcpServer routes record lookup to the requested connector', async () => {
  const server = new SourceSystemsMcpServer({
    connectors: [connector('crm', 0.95)],
  });

  const record = await server.getRecord('crm', 'rec-123');
  const provenance = await server.explainRecord('crm', 'rec-123');

  assert.equal(record?.sourceRecordId, 'rec-123');
  assert.equal(record?.attributes.id, 'rec-123');
  assert.equal(provenance?.sourceRecordId, 'rec-123');
  assert.deepEqual(provenance?.queryEvidence, ['fixture lookup']);
});

test('SourceSystemsMcpServer fails closed for unknown connectors', async () => {
  const server = new SourceSystemsMcpServer({
    connectors: [connector('crm', 0.95)],
  });

  await assert.rejects(
    () => server.getRecord('warehouse', 'rec-123'),
    /Unknown connector: warehouse/,
  );
});

test('SourceSystemsMcpServer lists connector metadata and health', async () => {
  const server = new SourceSystemsMcpServer({
    connectors: [connector('crm', 0.95)],
  });

  const connectors = await server.listConnectors();

  assert.deepEqual(connectors[0], {
    id: 'crm',
    displayName: 'crm Connector',
    systemType: 'crm',
    capabilities: ['search', 'get_record', 'explain'],
    health: {
      connectorId: 'crm',
      ok: true,
      checkedAt: '2026-01-01T00:00:00.000Z',
    },
  });
});
