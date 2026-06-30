import type {
  CandidateRecord,
  PrivacyConnector,
  PrivacyRecord,
  RecordProvenance,
  SubjectSearchInput,
} from '../../../connectors/sdk/src/types';

export type SourceSystemsToolName =
  | 'search_subject'
  | 'get_record'
  | 'explain_record'
  | 'list_connectors';

export type SourceSystemsServerConfig = {
  connectors: PrivacyConnector[];
};

export class SourceSystemsMcpServer {
  constructor(private readonly config: SourceSystemsServerConfig) {}

  async searchSubject(input: SubjectSearchInput): Promise<CandidateRecord[]> {
    const results = await Promise.all(
      this.config.connectors.map((connector) => connector.searchSubject(input)),
    );

    return results
      .flat()
      .sort((left, right) => right.confidence - left.confidence);
  }

  async getRecord(connectorId: string, sourceRecordId: string): Promise<PrivacyRecord | null> {
    const connector = this.getConnector(connectorId);
    return connector.getRecord(sourceRecordId);
  }

  async explainRecord(connectorId: string, sourceRecordId: string): Promise<RecordProvenance | null> {
    const connector = this.getConnector(connectorId);
    return connector.explainRecord(sourceRecordId);
  }

  async listConnectors() {
    return Promise.all(
      this.config.connectors.map(async (connector) => ({
        id: connector.id,
        displayName: connector.displayName,
        systemType: connector.systemType,
        capabilities: connector.capabilities,
        health: await connector.health(),
      })),
    );
  }

  private getConnector(connectorId: string): PrivacyConnector {
    const connector = this.config.connectors.find((candidate) => candidate.id === connectorId);
    if (!connector) {
      throw new Error(`Unknown connector: ${connectorId}`);
    }
    return connector;
  }
}
