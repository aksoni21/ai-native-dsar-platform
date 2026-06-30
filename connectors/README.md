# Connector SDK

Connectors adapt enterprise systems into a common privacy operations model. The agents should not need to know whether a record came from a CRM, warehouse, marketing tool, dealer system, support platform, or custom database.

The public demo ships with seed data and Postgres-backed examples. The browser runtime still uses local app query functions for its live source-system tools; production deployments should implement connectors against the customer's own systems and bind them behind the same MCP/tool contracts.

## Design Goals

- Read-only by default.
- Return normalized privacy records.
- Preserve source provenance.
- Explain matching confidence.
- Avoid bulk export unless explicitly approved.
- Keep credentials outside source control.

## Minimal Connector Contract

```ts
import type {
  CandidateRecord,
  ConnectorHealth,
  PrivacyConnector,
  PrivacyRecord,
  RecordProvenance,
  SubjectSearchInput,
} from './sdk/src/types';
```

Every connector should support:

- `health()` to confirm connectivity without leaking data.
- `searchSubject()` to find candidate records by identifiers.
- `getRecord()` to retrieve a single normalized record.
- `explainRecord()` to return provenance and match reasoning.

## Example Systems

- Salesforce or HubSpot CRM
- Snowflake, BigQuery, Redshift, or Postgres warehouse
- Braze, Iterable, Marketo, or Customer.io marketing systems
- Zendesk, Intercom, or ServiceNow support systems
- Vehicle, IoT, or device telemetry systems
- S3/GCS/Azure Blob exports
