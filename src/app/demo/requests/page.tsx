'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Inbox,
  Mail,
  Phone,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/demo/ThemeToggle';
import { cn, formatDate, formatDateTime, requestTypeLabel, daysUntil } from '@/lib/utils';
import { SCENARIOS } from '@/lib/constants';
import { useLiveRequest } from '@/hooks/useLiveRequest';
import type { Theme } from '@/context/DemoContext';

const THEME_STORAGE_KEY = 'naica-demo-theme';

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

const ALL_STATUS = 'All statuses';
const staticIds = new Set(SCENARIOS.map((s) => s.requestId));

export default function AllRequestsPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const [rows, setRows] = useState<ListRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSetTheme = (t: Theme) => {
    setTheme(t);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetch('/api/requests/list?limit=500')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ requests: ListRow[]; total?: number }>;
      })
      .then((data) => {
        const list = data.requests ?? [];
        setRows(list);
        setTotal(data.total ?? null);
        setLoading(false);
        setSelectedId((prev) => prev ?? list[0]?.request_id ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load requests');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.status));
    return [ALL_STATUS, ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (statusFilter !== ALL_STATUS && r.status !== statusFilter) return false;
        if (!q) return true;
        const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`;
        const hay = `${r.request_id} ${name} ${r.email} ${r.state} ${(r.request_types ?? []).join(' ')}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rows, query, statusFilter]);

  const selectedRow = filtered.find((r) => r.request_id === selectedId) ?? null;

  return (
    <div
      className={cn(
        'flex h-dvh flex-col bg-background text-foreground transition-colors',
        theme === 'dark' && 'dark',
      )}
    >
      {/* Header — mirrors DemoLayout for visual continuity */}
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 py-2 sm:px-4 z-10">
        <Link
          href="/demo"
          className="group flex flex-shrink-0 items-center gap-1.5 rounded-md outline-none transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to demo"
          title="Back to demo"
        >
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary-foreground">N</span>
          </div>
          <span className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors">
            instrata
          </span>
        </Link>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/demo"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to demo
          </Link>
          <ThemeToggle theme={theme} onChange={handleSetTheme} />
        </div>
      </header>

      {/* Two-pane body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — master list */}
        <div className="flex w-full flex-col overflow-hidden lg:w-auto lg:flex-1 lg:border-r lg:border-border">
          {/* Title row */}
          <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div>
              <p className="mb-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Pipeline
              </p>
              <h1 className="text-xl font-semibold tracking-tight">All requests</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Refresh
              </button>
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Inbox className="h-3 w-3" />
                {total !== null ? `${filtered.length} of ${total}` : `${filtered.length}`}
              </div>
            </div>
          </div>

          {/* Search + status filter */}
          <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by ID, name, email, state, or type…"
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                aria-label="Search requests"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-shrink-0 rounded-md border border-border bg-background px-2 py-2 text-[12px] font-medium text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              aria-label="Filter by status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === ALL_STATUS ? s : s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto thin-scroll">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading requests…
              </div>
            ) : error ? (
              <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <div className="font-medium">Couldn't load requests</div>
                  <div className="mt-0.5 text-[13px]">{error}</div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="mx-4 mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
                No requests match.
              </div>
            ) : (
              <ul>
                {filtered.map((r) => (
                  <RequestRow
                    key={r.request_id}
                    row={r}
                    active={r.request_id === selectedId}
                    onSelect={() => {
                      setSelectedId(r.request_id);
                      setMobileDetailOpen(true);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right — detail panel (desktop persistent) */}
        <div className="hidden w-full max-w-[420px] flex-shrink-0 flex-col overflow-hidden lg:flex">
          {selectedRow ? (
            <DetailPanel row={selectedRow} onClose={null} />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>

      {/* Mobile drawer — opens when a row is tapped */}
      {mobileDetailOpen && selectedRow && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            aria-label="Close preview"
            onClick={() => setMobileDetailOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-enter"
          />
          <div className="absolute right-0 top-0 h-dvh w-full max-w-sm bg-background shadow-2xl drawer-enter">
            <DetailPanel row={selectedRow} onClose={() => setMobileDetailOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function RequestRow({
  row,
  active,
  onSelect,
}: {
  row: ListRow;
  active: boolean;
  onSelect: () => void;
}) {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || '(no name)';
  const types = (row.request_types ?? []).map((t) => requestTypeLabel(t)).join(', ') || '—';

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          'flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors sm:px-6',
          active ? 'bg-primary/[0.06]' : 'hover:bg-accent/60',
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'font-mono text-[12px] font-semibold',
              active ? 'text-primary' : 'text-foreground',
            )}
          >
            {row.request_id}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">{name}</span>
          <span className="flex-shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
            {row.state}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{types}</span>
          <span className="flex-shrink-0 capitalize">{row.status.replace(/_/g, ' ')}</span>
        </div>
      </button>
    </li>
  );
}

function EmptyDetail() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Select a request to preview it here.</p>
    </div>
  );
}

function DetailPanel({ row, onClose }: { row: ListRow; onClose: (() => void) | null }) {
  const { request, loading, error } = useLiveRequest(row.request_id);
  const isStatic = staticIds.has(row.request_id);
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || '(no name)';

  const days = request ? daysUntil(request.deadline_at) : null;
  const slaTone =
    days === null ? 'muted' : days < 0 ? 'danger' : days <= 7 ? 'warning' : 'success';
  const slaLabel = days === null ? '—' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d to SLA`;
  const slaClass: Record<string, string> = {
    danger: 'bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
    success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto thin-scroll">
      <div className="flex flex-shrink-0 items-start justify-between gap-2 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-foreground">{row.request_id}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-px text-[10px] font-medium',
                isStatic ? 'bg-muted text-muted-foreground' : 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
              )}
            >
              {isStatic ? 'Demo' : 'Live'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {name} · {row.state}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading details…
          </div>
        ) : error || !request ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error ?? 'Details unavailable.'}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                slaClass[slaTone],
              )}
            >
              {request.status.replace(/_/g, ' ')} · {slaLabel}
            </span>

            <dl className="space-y-2.5 text-[13px]">
              <DetailRow label="Request type">{requestTypeLabel(request.request_type)}</DetailRow>
              {request.consumer_email && (
                <DetailRow label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
                  <a href={`mailto:${request.consumer_email}`} className="hover:text-primary hover:underline">
                    {request.consumer_email}
                  </a>
                </DetailRow>
              )}
              {request.consumer_phone && (
                <DetailRow label="Phone" icon={<Phone className="h-3.5 w-3.5" />}>
                  {request.consumer_phone}
                </DetailRow>
              )}
              <DetailRow label="Deadline">{formatDate(request.deadline_at)}</DetailRow>
              <DetailRow label="Submitted">{formatDateTime(request.created_at)}</DetailRow>
              {request.duplicate_of_id && (
                <DetailRow label="Duplicate of">
                  <span className="font-mono">{request.duplicate_of_id}</span>
                </DetailRow>
              )}
            </dl>

            {request.demo_scenario && (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {request.demo_scenario}
              </p>
            )}

            <Link
              href={`/demo?request_id=${encodeURIComponent(row.request_id)}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open in pipeline
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex flex-shrink-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{children}</span>
    </div>
  );
}
