'use client';

import { useEffect, useState } from 'react';
import { getRequestById } from '@/lib/data';
import type { RequestData } from '@/types';

const liveCache = new Map<string, RequestData>();
const inflight = new Map<string, Promise<RequestData | null>>();

export async function fetchLiveRequest(id: string): Promise<RequestData | null> {
  const cached = liveCache.get(id);
  if (cached) return cached;
  const pending = inflight.get(id);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(`/api/requests/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as RequestData;
    liveCache.set(id, data);
    return data;
  })().finally(() => inflight.delete(id));

  inflight.set(id, p);
  return p;
}

export interface UseLiveRequestResult {
  request: RequestData | undefined;
  loading: boolean;
  error: string | null;
}

export function useLiveRequest(id: string): UseLiveRequestResult {
  const staticHit = getRequestById(id);
  const [request, setRequest] = useState<RequestData | undefined>(
    staticHit ?? liveCache.get(id),
  );
  const [loading, setLoading] = useState<boolean>(!staticHit && !liveCache.has(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fromStatic = getRequestById(id);
    if (fromStatic) {
      setRequest(fromStatic);
      setLoading(false);
      setError(null);
      return;
    }
    const cached = liveCache.get(id);
    if (cached) {
      setRequest(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setRequest(undefined);
    setLoading(true);
    setError(null);
    fetchLiveRequest(id)
      .then((data) => {
        if (cancelled) return;
        setRequest(data ?? undefined);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load request');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { request, loading, error };
}
