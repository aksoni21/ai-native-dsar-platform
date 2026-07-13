export type Bucket = 'approval' | 'searching' | 'review' | 'completed';

export interface QueueRow {
  id: string;
  name: string;
  region: string;
  verify: string;
  type: string;
  bucket: Bucket;
  status: string;
  slaDays: number;
  reviewer: string;
  initials: string;
  avatarBg: string;
}

const STATUS_LABEL: Record<Bucket, string> = {
  approval: 'Awaiting approval',
  searching: 'Agent searching',
  review: 'In review',
  completed: 'Completed',
};

// TODO: this is seed/mock data. In production, fetch the real request queue
// (id, consumer, region, verification, type, bucket, SLA days remaining,
// reviewer) from the backend, and derive the dashboard's stat cards from it.
export const QUEUE_ROWS: QueueRow[] = [
  { id: 'DSAR-2041', name: 'Dana Whitfield', region: 'CA', verify: 'verified', type: 'Right to Know', bucket: 'approval', status: STATUS_LABEL.approval, slaDays: 6, reviewer: 'You', initials: 'OP', avatarBg: '#2F6BFF' },
  { id: 'DSAR-2039', name: 'Marcus Lee', region: 'CO', verify: 'verified', type: 'Delete My Data', bucket: 'approval', status: STATUS_LABEL.approval, slaDays: 4, reviewer: 'R. Osei', initials: 'RO', avatarBg: '#17936B' },
  { id: 'DSAR-2038', name: 'Priya Nair', region: 'EU', verify: 'pending', type: 'Access My Data', bucket: 'searching', status: STATUS_LABEL.searching, slaDays: 18, reviewer: 'Unassigned', initials: '—', avatarBg: '#8A90A0' },
  { id: 'DSAR-2036', name: 'T. Alvarez', region: 'TX', verify: 'verified', type: 'Correction', bucket: 'review', status: STATUS_LABEL.review, slaDays: 22, reviewer: 'J. Kim', initials: 'JK', avatarBg: '#B7791F' },
  { id: 'DSAR-2035', name: 'Sofia Romero', region: 'VA', verify: 'verified', type: 'Right to Know', bucket: 'approval', status: STATUS_LABEL.approval, slaDays: 11, reviewer: 'You', initials: 'OP', avatarBg: '#2F6BFF' },
  { id: 'DSAR-2031', name: 'Ken Tanaka', region: 'CA', verify: 'verified', type: 'Delete My Data', bucket: 'completed', status: STATUS_LABEL.completed, slaDays: 30, reviewer: 'R. Osei', initials: 'RO', avatarBg: '#17936B' },
  { id: 'DSAR-2028', name: 'Amelia Ford', region: 'EU', verify: 'verified', type: 'Access My Data', bucket: 'review', status: STATUS_LABEL.review, slaDays: 15, reviewer: 'J. Kim', initials: 'JK', avatarBg: '#B7791F' },
];

export const BUCKET_BY_FILTER: Record<string, Bucket | null> = {
  All: null,
  'Awaiting approval': 'approval',
  'Agent searching': 'searching',
  'In review': 'review',
  Completed: 'completed',
};
