export type SystemType = 'mainframe' | 'snowflake' | 'salesforce' | 'distributed' | 'as400' | 'other';

export interface DataSourceMeta {
  id: string;
  friendly_name: string;
  system_type: SystemType;
  connection_method: string;
  simulated_latency_ms: number;
}

export const DATA_SOURCES: Record<string, DataSourceMeta> = {
  'NNA Database': {
    id: 'NNA Database',
    friendly_name: 'Legacy Master DB',
    system_type: 'mainframe',
    connection_method: 'SFTP File Extract',
    simulated_latency_ms: 300,
  },
  'Customer 360 (C360)': {
    id: 'Customer 360 (C360)',
    friendly_name: 'Customer Main',
    system_type: 'snowflake',
    connection_method: 'Stored Procedure',
    simulated_latency_ms: 1200,
  },
  PBS: {
    id: 'PBS',
    friendly_name: 'CRM',
    system_type: 'salesforce',
    connection_method: 'REST API (OAuth)',
    simulated_latency_ms: 800,
  },
  'Vehicle Services': {
    id: 'Vehicle Services',
    friendly_name: 'Vehicle Services',
    system_type: 'distributed',
    connection_method: 'REST API',
    simulated_latency_ms: 1500,
  },
  'Dealer Records': {
    id: 'Dealer Records',
    friendly_name: 'Dealer Records',
    system_type: 'distributed',
    connection_method: 'JDBC (Read-Only)',
    simulated_latency_ms: 1100,
  },
  // Technical schema names used by records.json — aliased onto the friendly
  // demo names so SystemBadge / SearchResults render correct system types
  // and connection methods instead of falling through to "Other / Unknown".
  CustomerMaster: {
    id: 'CustomerMaster',
    friendly_name: 'Legacy Master DB',
    system_type: 'mainframe',
    connection_method: 'SFTP File Extract',
    simulated_latency_ms: 300,
  },
  DataWarehouse: {
    id: 'DataWarehouse',
    friendly_name: 'Customer Main',
    system_type: 'snowflake',
    connection_method: 'Stored Procedure',
    simulated_latency_ms: 1200,
  },
  SalesCRM: {
    id: 'SalesCRM',
    friendly_name: 'CRM',
    system_type: 'salesforce',
    connection_method: 'REST API (OAuth)',
    simulated_latency_ms: 800,
  },
  VehicleServices: {
    id: 'VehicleServices',
    friendly_name: 'Vehicle Services',
    system_type: 'distributed',
    connection_method: 'REST API',
    simulated_latency_ms: 1500,
  },
  DealerRecords: {
    id: 'DealerRecords',
    friendly_name: 'Dealer Records',
    system_type: 'distributed',
    connection_method: 'JDBC (Read-Only)',
    simulated_latency_ms: 1100,
  },
  Marketing: {
    id: 'Marketing',
    friendly_name: 'Marketing Cloud',
    system_type: 'salesforce',
    connection_method: 'REST API (OAuth)',
    simulated_latency_ms: 900,
  },
  // VIN-only sources — keyed by VIN, no consumer attribution at write time.
  // Surfaced through the VIN-User Search step bounded by ownership window.
  Telematics: {
    id: 'Telematics',
    friendly_name: 'Telematics',
    system_type: 'distributed',
    connection_method: 'Kafka Stream',
    simulated_latency_ms: 700,
  },
  ManufacturingQA: {
    id: 'ManufacturingQA',
    friendly_name: 'Manufacturing QA',
    system_type: 'distributed',
    connection_method: 'JDBC (Read-Only)',
    simulated_latency_ms: 1300,
  },
  RecallCampaigns: {
    id: 'RecallCampaigns',
    friendly_name: 'Recall Campaigns',
    system_type: 'distributed',
    connection_method: 'REST API',
    simulated_latency_ms: 900,
  },
  IndependentShopService: {
    id: 'IndependentShopService',
    friendly_name: 'Independent Shop Service',
    system_type: 'distributed',
    connection_method: 'SFTP File Extract',
    simulated_latency_ms: 1400,
  },
};

export interface SystemTypeMeta {
  label: string;
  iconName: string;
  badgeClass: string;
}

export const SYSTEM_TYPES: Record<SystemType, SystemTypeMeta> = {
  mainframe: {
    label: 'Mainframe',
    iconName: 'Server',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  snowflake: {
    label: 'Snowflake',
    iconName: 'Snowflake',
    badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  },
  salesforce: {
    label: 'Salesforce',
    iconName: 'Cloud',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  distributed: {
    label: 'Distributed',
    iconName: 'Network',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  as400: {
    label: 'AS/400',
    iconName: 'HardDrive',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  other: {
    label: 'Other',
    iconName: 'Database',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
};

export function getDataSourceMeta(sourceId: string): DataSourceMeta {
  return (
    DATA_SOURCES[sourceId] || {
      id: sourceId,
      friendly_name: sourceId,
      system_type: 'other',
      connection_method: 'Unknown',
      simulated_latency_ms: 1000,
    }
  );
}

export function getSystemTypeMeta(type: SystemType): SystemTypeMeta {
  return SYSTEM_TYPES[type];
}

export function getSystemTypeForSource(sourceId: string): SystemType {
  return getDataSourceMeta(sourceId).system_type;
}

export function getConnectionMethod(sourceId: string): string {
  return getDataSourceMeta(sourceId).connection_method;
}
