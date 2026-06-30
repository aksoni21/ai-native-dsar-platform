import type {
  CandidateRecord,
  ConnectorHealth,
  PrivacyConnector,
  PrivacyRecord,
  RecordProvenance,
  SubjectSearchInput,
} from '../../sdk/src/types';

type QueryFn = <T>(sql: string, params: unknown[]) => Promise<T[]>;

export class PostgresPrivacyConnector implements PrivacyConnector {
  id = 'postgres-example';
  displayName = 'Example Postgres Source System';
  systemType = 'warehouse' as const;
  capabilities: PrivacyConnector['capabilities'] = ['search', 'get_record', 'explain'];

  constructor(private readonly query: QueryFn) {}

  async health(): Promise<ConnectorHealth> {
    await this.query<{ ok: number }>('select 1 as ok', []);
    return {
      connectorId: this.id,
      ok: true,
      checkedAt: new Date().toISOString(),
    };
  }

  async searchSubject(input: SubjectSearchInput): Promise<CandidateRecord[]> {
    const rows = await this.query<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    }>(
      `
        select id, first_name, last_name, email, phone
        from privacy_subject_records
        where ($1::text is null or lower(email) = lower($1))
           or ($2::text is null or phone = $2)
           or ($3::text is null or lower(last_name) = lower($3))
        limit 25
      `,
      [input.email ?? null, input.phone ?? null, input.lastName ?? null],
    );

    return rows.map((row) => ({
      connectorId: this.id,
      sourceSystem: this.displayName,
      sourceRecordId: row.id,
      subjectDisplayName: [row.first_name, row.last_name].filter(Boolean).join(' '),
      matchedIdentifiers: [
        row.email && input.email && row.email.toLowerCase() === input.email.toLowerCase() ? 'email' : '',
        row.phone && input.phone && row.phone === input.phone ? 'phone' : '',
        row.last_name && input.lastName && row.last_name.toLowerCase() === input.lastName.toLowerCase() ? 'last_name' : '',
      ].filter(Boolean),
      confidence: row.email === input.email || row.phone === input.phone ? 0.95 : 0.55,
      includeRecommendation: row.email === input.email || row.phone === input.phone ? 'include' : 'review',
      reasoning: 'Candidate returned by the Postgres connector using deterministic identifier search.',
    }));
  }

  async getRecord(sourceRecordId: string): Promise<PrivacyRecord | null> {
    const rows = await this.query<Record<string, unknown>>(
      'select * from privacy_subject_records where id = $1 limit 1',
      [sourceRecordId],
    );
    const row = rows[0];
    if (!row) return null;

    return {
      connectorId: this.id,
      sourceSystem: this.displayName,
      sourceRecordId,
      categories: ['customer_profile'],
      attributes: row,
    };
  }

  async explainRecord(sourceRecordId: string): Promise<RecordProvenance | null> {
    return {
      connectorId: this.id,
      sourceSystem: this.displayName,
      sourceRecordId,
      sourceTableOrObject: 'privacy_subject_records',
      queryEvidence: ['Parameterized lookup by source record ID.'],
      normalizationNotes: ['Raw row is mapped into the common PrivacyRecord shape.'],
      dataQualityFlags: [],
    };
  }
}
