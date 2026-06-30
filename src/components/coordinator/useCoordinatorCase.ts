'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CommunicationCase,
  CommunicationMessage,
  CommunicationExtractedFacts,
} from '@/types';

export interface CoordinatorCaseLookup {
  caseId?: string;
  requestId?: string;
  vin?: string;
  /**
   * If set, the bundle is re-fetched on this interval (ms). Use for live
   * round-trip flows where the page is waiting on an IMAP-ingested reply.
   * Polling stops automatically when the hook unmounts.
   */
  pollIntervalMs?: number;
}

export interface CoordinatorOutboundState {
  approved: boolean;
  approvedAt: string | null;
  approveOutbound: () => void;
}

export interface CoordinatorInboundState {
  /** Whether the operator clicked the "▶ Simulate reply received" button. */
  replyRevealed: boolean;
  revealReply: () => void;
  /** Whether the operator clicked into the literal reply text. Gates Approve. */
  hasReadReplyText: boolean;
  markReplyTextRead: () => void;
  /** Whether the operator approved the recommended next action. */
  attributionApproved: boolean;
  approvedAt: string | null;
  approveAttribution: () => void;
}

export interface UseCoordinatorCaseReturn {
  caseId: string | null;
  caseRecord: CommunicationCase | null;
  /** Chronological outbound messages (oldest → newest). */
  outbounds: CommunicationMessage[];
  /** Chronological inbound messages (oldest → newest). */
  inbounds: CommunicationMessage[];
  /** Facts keyed by inbound message id. */
  factsByMessage: Record<string, CommunicationExtractedFacts>;
  /** Per-message outbound gate state. */
  outboundStateFor: (messageId: string) => CoordinatorOutboundState;
  /** Per-message inbound gate state. */
  inboundStateFor: (messageId: string) => CoordinatorInboundState;
  loading: boolean;
  /** Force an immediate refetch (e.g. after firing /send or /reset). */
  refetch: () => void;
  // ─── Legacy single-turn fields (latest message of each direction) ─────────
  outbound: CommunicationMessage | null;
  inbound: CommunicationMessage | null;
  facts: CommunicationExtractedFacts | null;
  outboundState: CoordinatorOutboundState;
  inboundState: CoordinatorInboundState;
}

interface CaseBundleResponse {
  case: CommunicationCase;
  messages: CommunicationMessage[];
  facts: Record<string, CommunicationExtractedFacts>;
}

interface OutboundLocalState {
  approved: boolean;
  approvedAt: string | null;
}

interface InboundLocalState {
  replyRevealed: boolean;
  hasReadReplyText: boolean;
  attributionApproved: boolean;
  attributionApprovedAt: string | null;
}

const EMPTY_OUTBOUND_STATE: CoordinatorOutboundState = {
  approved: false,
  approvedAt: null,
  approveOutbound: () => {},
};

const EMPTY_INBOUND_STATE: CoordinatorInboundState = {
  replyRevealed: false,
  revealReply: () => {},
  hasReadReplyText: false,
  markReplyTextRead: () => {},
  attributionApproved: false,
  approvedAt: null,
  approveAttribution: () => {},
};

function buildQuery(lookup: CoordinatorCaseLookup): string | null {
  const params = new URLSearchParams();
  if (lookup.caseId) params.set('caseId', lookup.caseId);
  else if (lookup.requestId) params.set('requestId', lookup.requestId);
  else if (lookup.vin) params.set('vin', lookup.vin);
  else return null;
  return params.toString();
}

/**
 * Loads one Coordinator case (case + messages + extracted facts) from the
 * /api/coordinator/case bundle endpoint and tracks UI-only approval flags
 * per-message. Local flags don't mutate the DB — the post-approval pipeline
 * owns the actual writes via /api/coordinator/messages/:id/send (outbound)
 * and the future apply_attribution endpoint (inbound).
 *
 * Multi-turn: outbounds + inbounds are full chronological arrays. Per-message
 * gate state is keyed by message id so multiple outbound approvals or inbound
 * read-attestations don't collide. Legacy `outbound`/`inbound`/`outboundState`
 * /`inboundState` fields are kept and point at the latest of each direction
 * for back-compat with single-turn views.
 */
export function useCoordinatorCase(lookup: CoordinatorCaseLookup): UseCoordinatorCaseReturn {
  const query = useMemo(
    () => buildQuery(lookup),
    [lookup.caseId, lookup.requestId, lookup.vin],
  );
  const pollIntervalMs = lookup.pollIntervalMs;

  const [bundle, setBundle] = useState<CaseBundleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!query);
  // Bumping this counter triggers a refetch in the effect below.
  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!query) {
      setBundle(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch(`/api/coordinator/case?${query}`);
        if (!res.ok) {
          if (!cancelled && showSpinner) setLoading(false);
          return;
        }
        const data = (await res.json()) as CaseBundleResponse;
        if (cancelled) return;
        setBundle(data);
        if (showSpinner) setLoading(false);
      } catch {
        if (cancelled) return;
        if (showSpinner) setLoading(false);
      }
    };

    fetchOnce(true);

    if (pollIntervalMs && pollIntervalMs > 0) {
      timer = setInterval(() => fetchOnce(false), pollIntervalMs);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [query, refreshKey, pollIntervalMs]);

  const outbounds = useMemo(
    () => (bundle?.messages ?? []).filter((m) => m.direction === 'outbound'),
    [bundle],
  );
  const inbounds = useMemo(
    () => (bundle?.messages ?? []).filter((m) => m.direction === 'inbound'),
    [bundle],
  );
  const factsByMessage = useMemo(() => bundle?.facts ?? {}, [bundle]);

  // Per-message gate state. Keyed by message id; entries created lazily on
  // first access via outboundStateFor / inboundStateFor.
  const [outboundStates, setOutboundStates] = useState<Record<string, OutboundLocalState>>({});
  const [inboundStates, setInboundStates] = useState<Record<string, InboundLocalState>>({});

  // Initialize each outbound's state from the seed data — `agent_drafted`
  // outbounds with `sent_at` set are already approved/sent in the seed.
  useEffect(() => {
    setOutboundStates((prev) => {
      const next = { ...prev };
      for (const o of outbounds) {
        if (next[o.id]) continue; // don't overwrite operator clicks
        next[o.id] = {
          approved: !!(o.approved_by && o.sent_at),
          approvedAt: o.approved_at ?? null,
        };
      }
      return next;
    });
  }, [outbounds]);

  const outboundStateFor = useCallback(
    (messageId: string): CoordinatorOutboundState => {
      const local = outboundStates[messageId];
      return {
        approved: local?.approved ?? false,
        approvedAt: local?.approvedAt ?? null,
        approveOutbound: () => {
          setOutboundStates((prev) => ({
            ...prev,
            [messageId]: {
              approved: true,
              approvedAt: prev[messageId]?.approvedAt ?? new Date().toISOString(),
            },
          }));
        },
      };
    },
    [outboundStates],
  );

  const inboundStateFor = useCallback(
    (messageId: string): CoordinatorInboundState => {
      const local = inboundStates[messageId];
      return {
        replyRevealed: local?.replyRevealed ?? false,
        revealReply: () => {
          setInboundStates((prev) => ({
            ...prev,
            [messageId]: {
              ...(prev[messageId] ?? {
                replyRevealed: false,
                hasReadReplyText: false,
                attributionApproved: false,
                attributionApprovedAt: null,
              }),
              replyRevealed: true,
            },
          }));
        },
        hasReadReplyText: local?.hasReadReplyText ?? false,
        markReplyTextRead: () => {
          setInboundStates((prev) => ({
            ...prev,
            [messageId]: {
              ...(prev[messageId] ?? {
                replyRevealed: true,
                hasReadReplyText: false,
                attributionApproved: false,
                attributionApprovedAt: null,
              }),
              hasReadReplyText: true,
            },
          }));
        },
        attributionApproved: local?.attributionApproved ?? false,
        approvedAt: local?.attributionApprovedAt ?? null,
        approveAttribution: () => {
          setInboundStates((prev) => {
            const cur = prev[messageId];
            if (!cur?.hasReadReplyText) return prev;
            return {
              ...prev,
              [messageId]: {
                ...cur,
                attributionApproved: true,
                attributionApprovedAt:
                  cur.attributionApprovedAt ?? new Date().toISOString(),
              },
            };
          });
        },
      };
    },
    [inboundStates],
  );

  // ─── Legacy single-turn projections ──────────────────────────────────────
  const latestOutbound = outbounds[outbounds.length - 1] ?? null;
  const latestInbound = inbounds[inbounds.length - 1] ?? null;
  const latestFacts = latestInbound ? factsByMessage[latestInbound.id] ?? null : null;

  const legacyOutboundState = latestOutbound
    ? outboundStateFor(latestOutbound.id)
    : EMPTY_OUTBOUND_STATE;
  const legacyInboundState = latestInbound
    ? inboundStateFor(latestInbound.id)
    : EMPTY_INBOUND_STATE;

  return {
    caseId: bundle?.case.id ?? null,
    caseRecord: bundle?.case ?? null,
    outbounds,
    inbounds,
    factsByMessage,
    outboundStateFor,
    inboundStateFor,
    loading,
    refetch,
    outbound: latestOutbound,
    inbound: latestInbound,
    facts: latestFacts,
    outboundState: legacyOutboundState,
    inboundState: legacyInboundState,
  };
}
