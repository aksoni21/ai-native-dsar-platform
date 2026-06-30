'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, AlertCircle, Search, ListFilter } from 'lucide-react';
import { useDemoContext } from '@/context/DemoContext';
import { SCENARIOS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ListRow {
  request_id: string;
  first_name: string;
  last_name: string;
  email: string;
  state: string;
  request_types: string[];
  status: string;
  created_at: string;
}

interface RequestPickerProps {
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
}

export function RequestPicker({ anchorRef, onClose }: RequestPickerProps) {
  const { setActiveLiveRequestId, activeScenario } = useDemoContext();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position anchored to the trigger button. Re-measure on resize/scroll.
  useEffect(() => {
    setMounted(true);
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/requests/list?limit=50')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ requests: ListRow[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.requests ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load requests');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Click-outside dismiss (anchor + popover both count as inside)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = containerRef.current;
      const anchor = anchorRef.current;
      const target = e.target as Node;
      if (el?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const id = window.setTimeout(() => {
      window.addEventListener('mousedown', handler);
      window.addEventListener('keydown', escHandler);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', escHandler);
    };
  }, [onClose, anchorRef]);

  const staticIds = new Set(SCENARIOS.map((s) => s.requestId));
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (!q) return true;
    const hay = `${r.request_id} ${r.first_name} ${r.last_name} ${r.email} ${r.state}`.toLowerCase();
    return hay.includes(q);
  });
  const liveRows = filtered.filter((r) => !staticIds.has(r.request_id));
  const staticRows = filtered.filter((r) => staticIds.has(r.request_id));

  const select = (requestId: string) => {
    setActiveLiveRequestId(requestId);
    onClose();
  };

  if (!mounted || !coords) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-50 w-[360px] max-w-[calc(100vw-1rem)] origin-top-left rounded-lg border border-border bg-card text-foreground shadow-lg"
      role="dialog"
      aria-label="Pick a request"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID, name, email, or state…"
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            clear
          </button>
        )}
      </div>

      <div className="max-h-[60vh] overflow-y-auto thin-scroll p-1">
        {loading && (
          <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading requests…
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Couldn't load requests</div>
              <div className="mt-0.5">{error}</div>
            </div>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No requests match.
          </div>
        )}

        {liveRows.length > 0 && (
          <Section label="Live submissions">
            {liveRows.map((r) => (
              <Row
                key={r.request_id}
                row={r}
                active={activeScenario.requestId === r.request_id}
                onSelect={select}
              />
            ))}
          </Section>
        )}

        {staticRows.length > 0 && (
          <Section label="Demo scenarios">
            {staticRows.map((r) => (
              <Row
                key={r.request_id}
                row={r}
                active={activeScenario.requestId === r.request_id}
                onSelect={select}
              />
            ))}
          </Section>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
        <ListFilter className="h-3 w-3" />
        Showing the {rows.length} most recent intake requests
      </div>
    </div>,
    document.body,
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  row,
  active,
  onSelect,
}: {
  row: ListRow;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || '(no name)';
  const types = (row.request_types ?? []).join(', ') || '—';
  return (
    <button
      type="button"
      onClick={() => onSelect(row.request_id)}
      className={cn(
        'w-full rounded-md px-2 py-1.5 text-left transition-colors',
        active ? 'bg-primary/10 text-foreground' : 'hover:bg-accent',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold">{row.request_id}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {row.state}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate font-medium">{name}</span>
        <span className="flex-shrink-0 text-[10px] text-muted-foreground">{row.status}</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{types}</div>
    </button>
  );
}
