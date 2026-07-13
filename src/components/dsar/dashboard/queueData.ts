import { getRequestById } from '@/lib/data';
import { daysUntil } from '@/lib/utils';

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

const REQUEST_TYPE_LABEL: Record<string, string> = {
  right_to_know: 'Right to Know',
  deletion: 'Delete My Data',
  correction: 'Correction',
  opt_out: 'Opt Out',
};

// Real request status -> dashboard filter bucket. There's no exact real
// analogue for "in review" (a human actively looking, pre-decision), so
// 'approved' — a decision made but not yet the terminal 'completed' state —
// is mapped there as the closest fit.
const BUCKET_BY_STATUS: Record<string, Bucket> = {
  pending_review: 'approval',
  processing: 'searching',
  approved: 'review',
  completed: 'completed',
};

const REVIEWERS = [
  { reviewer: 'You', initials: 'OP', avatarBg: '#2F6BFF' },
  { reviewer: 'R. Osei', initials: 'RO', avatarBg: '#17936B' },
  { reviewer: 'J. Kim', initials: 'JK', avatarBg: '#B7791F' },
  { reviewer: 'Unassigned', initials: '—', avatarBg: '#8A90A0' },
];

// A curated spread of real seeded requests (src/data/requests.json) across
// every dashboard bucket — same underlying data the Demo screen reads via
// @/lib/data, so a row's "Open" link always lands on a request that
// actually exists and matches what's shown here.
const QUEUE_REQUEST_IDS = ['REQ-002', 'REQ-008', 'REQ-010', 'REQ-004', 'REQ-007', 'REQ-006', 'REQ-001', 'REQ-009'];

export const QUEUE_ROWS: QueueRow[] = QUEUE_REQUEST_IDS.map((id, i) => {
  const request = getRequestById(id);
  if (!request) throw new Error(`queueData: seeded request ${id} not found in @/lib/data`);
  const bucket = BUCKET_BY_STATUS[request.status] ?? 'review';
  const reviewer = REVIEWERS[i % REVIEWERS.length];
  return {
    id: request.id,
    name: request.consumer_name,
    region: request.consumer_state,
    verify: 'verified',
    type: REQUEST_TYPE_LABEL[request.request_type] ?? request.request_type,
    bucket,
    status: STATUS_LABEL[bucket],
    slaDays: daysUntil(request.deadline_at),
    ...reviewer,
  };
});

export const BUCKET_BY_FILTER: Record<string, Bucket | null> = {
  All: null,
  'Awaiting approval': 'approval',
  'Agent searching': 'searching',
  'In review': 'review',
  Completed: 'completed',
};
