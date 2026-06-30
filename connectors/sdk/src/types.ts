export type ConnectorSystemType =
  | 'crm'
  | 'warehouse'
  | 'marketing'
  | 'support'
  | 'telematics'
  | 'dealer_system'
  | 'email'
  | 'custom';

export type SubjectSearchInput = {
  requestId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  vin?: string;
  state?: string;
  additionalIdentifiers?: Record<string, string>;
};

export type CandidateRecord = {
  connectorId: string;
  sourceSystem: string;
  sourceRecordId: string;
  subjectDisplayName?: string;
  matchedIdentifiers: string[];
  confidence: number;
  includeRecommendation: 'include' | 'exclude' | 'review';
  reasoning: string;
};

export type PrivacyRecord = {
  connectorId: string;
  sourceSystem: string;
  sourceRecordId: string;
  subject?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    state?: string;
  };
  categories: string[];
  attributes: Record<string, unknown>;
  collectedAt?: string;
  updatedAt?: string;
  retentionBasis?: string;
};

export type RecordProvenance = {
  connectorId: string;
  sourceSystem: string;
  sourceRecordId: string;
  sourceTableOrObject?: string;
  queryEvidence: string[];
  normalizationNotes: string[];
  dataQualityFlags: string[];
};

export type ConnectorHealth = {
  connectorId: string;
  ok: boolean;
  checkedAt: string;
  message?: string;
};

export interface PrivacyConnector {
  id: string;
  displayName: string;
  systemType: ConnectorSystemType;
  capabilities: Array<'search' | 'get_record' | 'explain' | 'decode' | 'queue_update'>;
  health(): Promise<ConnectorHealth>;
  searchSubject(input: SubjectSearchInput): Promise<CandidateRecord[]>;
  getRecord(sourceRecordId: string): Promise<PrivacyRecord | null>;
  explainRecord(sourceRecordId: string): Promise<RecordProvenance | null>;
}
