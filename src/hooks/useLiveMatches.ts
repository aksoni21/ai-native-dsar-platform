'use client';

import { useEffect, useState } from 'react';
import type { MatchData, RecordData } from '@/types';

interface LiveMatchesPayload {
  matches: MatchData[];
  recordsById: Map<string, RecordData>;
}

// Module-level cache + inflight dedupe so navigating away and back, or two
// components mounting on the same id, don't re-fetch. Map identity is stable
// per request id so downstream useMemos don't bust.
const cache = new Map<string, LiveMatchesPayload>();
const inflight = new Map<string, Promise<LiveMatchesPayload>>();

interface RawResponse {
  matches: MatchData[];
  records: RecordData[];
}

async function fetchLiveMatches(id: string): Promise<LiveMatchesPayload> {
  const cached = cache.get(id);
  if (cached) return cached;
  const pending = inflight.get(id);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(`/api/requests/${encodeURIComponent(id)}/matches`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as RawResponse;
    const recordsById = new Map<string, RecordData>();
    for (const r of data.records) recordsById.set(r.id, r);
    const payload: LiveMatchesPayload = { matches: data.matches, recordsById };
    cache.set(id, payload);
    return payload;
  })().finally(() => inflight.delete(id));

  inflight.set(id, p);
  return p;
}

export interface UseLiveMatchesResult {
  matches: MatchData[];
  recordsById: Map<string, RecordData>;
  loading: boolean;
  error: string | null;
}

const EMPTY_MAP: Map<string, RecordData> = new Map();

export function useLiveMatches(id: string, enabled: boolean): UseLiveMatchesResult {
  const initial = enabled ? cache.get(id) : undefined;
  const [matches, setMatches] = useState<MatchData[]>(initial?.matches ?? []);
  const [recordsById, setRecordsById] = useState<Map<string, RecordData>>(
    initial?.recordsById ?? EMPTY_MAP,
  );
  const [loading, setLoading] = useState<boolean>(enabled && !initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Clear local state synchronously when disabled (or when a curated
      // scenario is selected) to avoid leaking stale records.
      setMatches([]);
      setRecordsById(EMPTY_MAP);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = cache.get(id);
    if (cached) {
      setMatches(cached.matches);
      setRecordsById(cached.recordsById);
      setLoading(false);
      setError(null);
      return;
    }

    // No cache: clear stale state synchronously, then fetch.
    setMatches([]);
    setRecordsById(EMPTY_MAP);
    setLoading(true);
    setError(null);

    let cancelled = false;
    fetchLiveMatches(id)
      .then((payload) => {
        if (cancelled) return;
        setMatches(payload.matches);
        setRecordsById(payload.recordsById);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load matches');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, enabled]);

  return { matches, recordsById, loading, error };
}
