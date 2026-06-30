'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FileText, Mail, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRequestById,
  getMatchesForRequest,
  getRecordById,
  getComplianceRules,
} from '@/lib/data';
import { requestTypeLabel } from '@/lib/utils';
import type { MatchData, PipelineArtifact, PipelineEmail, RecordData, RequestData } from '@/types';

// Mirror of the deck palette in src/lib/pptx/generate-report.ts. Keep these in sync
// so the in-UI preview matches the .pptx the operator will actually open.
const PALETTE = {
  bg: '#0B1226',
  surface: '#141E36',
  surface2: '#1B2747',
  border: '#263352',
  fg: '#F4F4F5',
  fgSecondary: '#CBD5E1',
  muted: '#94A3B8',
  dim: '#64748B',
  accent: '#60A5FA',
  danger: '#F87171',
  ok: '#34D399',
  warn: '#FBBF24',
} as const;

function dispositionStyle(disp: string | null | undefined): { color: string; label: string } {
  if (!disp) return { color: PALETTE.muted, label: 'pending' };
  if (disp === 'full_delete') return { color: PALETTE.danger, label: 'full delete' };
  if (disp === 'mask' || disp === 'redact') return { color: PALETTE.warn, label: disp };
  if (disp === 'retain_exempt') return { color: PALETTE.warn, label: 'retain (exempt)' };
  if (disp === 'disclose' || disp === 'fulfill') return { color: PALETTE.ok, label: disp };
  return { color: PALETTE.accent, label: disp.replace(/_/g, ' ') };
}

type Preview =
  | { kind: 'pptx'; artifact: PipelineArtifact }
  | { kind: 'email'; email: PipelineEmail };

interface ArtifactPreviewModalProps {
  preview: Preview | null;
  onClose: () => void;
}

export function ArtifactPreviewModal({ preview, onClose }: ArtifactPreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!preview) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [preview, onClose]);

  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full rounded-xl border border-border bg-background shadow-xl mx-4',
          preview.kind === 'pptx' ? 'max-w-5xl' : 'max-w-2xl',
          'max-h-[90vh] overflow-hidden flex flex-col',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {preview.kind === 'pptx' ? (
          <PptxPreview artifact={preview.artifact} onClose={onClose} />
        ) : (
          <EmailPreview email={preview.email} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

interface LiveMatchesResponse {
  matches: MatchData[];
  records: RecordData[];
}

function PptxPreview({ artifact, onClose }: { artifact: PipelineArtifact; onClose: () => void }) {
  const seedRequest = getRequestById(artifact.request_id);
  const [request, setRequest] = useState<RequestData | null>(seedRequest ?? null);
  const seedMatches = getMatchesForRequest(artifact.request_id);
  const [matches, setMatches] = useState<MatchData[]>(seedMatches);
  const [liveRecords, setLiveRecords] = useState<Map<string, RecordData>>(new Map());
  const [loading, setLoading] = useState(!seedRequest);

  // For live-intake requests (REQ-1xxxxx) the seed maps return nothing. Fetch
  // the synthesized matches via /api/requests/[id]/matches so the preview
  // reflects what the actual .pptx will contain.
  useEffect(() => {
    if (seedRequest && seedMatches.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        if (!seedRequest) {
          const r = await fetch(`/api/requests/${artifact.request_id}`);
          if (r.ok) {
            const data = (await r.json()) as RequestData;
            if (!cancelled) setRequest(data);
          }
        }
        const m = await fetch(`/api/requests/${artifact.request_id}/matches`);
        if (m.ok) {
          const data = (await m.json()) as LiveMatchesResponse;
          if (!cancelled) {
            setMatches(data.matches ?? []);
            const map = new Map<string, RecordData>();
            for (const rec of data.records ?? []) map.set(rec.id, rec);
            setLiveRecords(map);
          }
        }
      } catch {
        // Preview is best-effort; silently fall through.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artifact.request_id, seedRequest, seedMatches.length]);

  const rule = request ? getComplianceRules(request.consumer_state, request.request_type) : undefined;
  const lookupRecord = (id: string): RecordData | undefined => getRecordById(id) ?? liveRecords.get(id);

  const sourceCounts = matches.reduce<Record<string, number>>((acc, m) => {
    const src = lookupRecord(m.record_id)?.data_source ?? 'unknown';
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});
  const sourcesHit = Object.keys(sourceCounts).length;
  const ambiguousCount = matches.filter((m) => m.match_decision === 'ambiguous').length;

  const dispositionCounts = matches.reduce<Record<string, number>>((acc, m) => {
    const k = m.disposition ?? 'pending';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const reportBody = (() => {
    if (request?.report_text) return request.report_text.slice(0, 2200);
    if (!request || matches.length === 0) {
      return 'No matched records and no persisted narrative for this request. Re-run the pipeline to materialize matches and the agent-generated report text before regenerating this deck.';
    }
    const dispLines = Object.entries(dispositionCounts)
      .map(([k, v]) => `  •  ${v} record(s) → ${k}`)
      .join('\n');
    const sourceLines = Object.entries(sourceCounts)
      .map(([k, v]) => `  •  ${k}: ${v} match(es)`)
      .join('\n');
    const ruleLine = rule
      ? `Controlling rule: ${request.consumer_state} ${requestTypeLabel(request.request_type)} — respond within ${rule.deadline_days} days; ${rule.required_disclosures.length} required disclosure(s); ${rule.exceptions?.length ?? 0} statutory exception(s) considered.`
      : `No controlling rule found for ${request.consumer_state} / ${requestTypeLabel(request.request_type)}.`;
    return [
      `Consumer ${request.consumer_name} (${request.consumer_email ?? 'no email on file'}) filed a ${requestTypeLabel(request.request_type)} request under ${request.consumer_state} law on ${new Date(request.created_at).toLocaleDateString()}.`,
      ``,
      ruleLine,
      ``,
      `Identity probes across the operator's source systems returned ${matches.length} match(es):`,
      sourceLines,
      ``,
      `Preview disposition (projected from statutory rule, not yet operator-approved):`,
      dispLines,
      ``,
      `This deck reflects the pipeline state at the time of generation. Rerun the live pipeline to capture the report-generator sub-agent narrative into the audit chain before delivery.`,
    ].join('\n');
  })();

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">{artifact.filename}</h2>
            <p className="text-[11px] text-muted-foreground font-mono">{artifact.path}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Slide deck */}
      <div
        className="flex-1 overflow-y-auto p-5 space-y-5"
        style={{ background: '#06091A' }}
      >
        {loading && matches.length === 0 ? (
          <div
            className="rounded-lg border aspect-[16/9] flex items-center justify-center text-sm italic"
            style={{ background: PALETTE.bg, borderColor: PALETTE.border, color: PALETTE.muted }}
          >
            Loading deck preview…
          </div>
        ) : (
          <>
            <TitleSlide request={request} requestId={artifact.request_id} matchCount={matches.length} />
            <ContentSlide
              request={request}
              page={2}
              of={5}
              title="Summary"
              subtitle="Request snapshot and controlling statute"
            >
              <SummarySlideBody request={request} rule={rule} matchCount={matches.length} />
            </ContentSlide>
            <ContentSlide
              request={request}
              page={3}
              of={5}
              title="Matched records"
              subtitle={`Identity probes across source systems returned ${matches.length} record${matches.length === 1 ? '' : 's'}`}
            >
              <RecordsSlideBody
                matches={matches}
                lookupRecord={lookupRecord}
                sourcesHit={sourcesHit}
                ambiguousCount={ambiguousCount}
              />
            </ContentSlide>
            <ContentSlide
              request={request}
              page={4}
              of={5}
              title="Disposition & reasoning"
              subtitle="Regulator-ready narrative for the audit file"
            >
              <DispositionSlideBody body={reportBody} />
            </ContentSlide>
            <ContentSlide
              request={request}
              page={5}
              of={5}
              title="Audit chain"
              subtitle="0 timestamped entries in the chain of custody"
            >
              <div
                className="rounded-lg border h-full flex items-center justify-center text-sm italic"
                style={{ background: PALETTE.surface, borderColor: PALETTE.border, color: PALETTE.muted }}
              >
                No audit entries recorded for this request yet.
              </div>
            </ContentSlide>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground bg-muted/20">
        Read-only preview — visual mock of the .pptx written to {artifact.path}. Open the file in
        PowerPoint or Keynote to see the rendered version.
      </div>
    </>
  );
}

// ─── Slide chrome ────────────────────────────────────────────────────────

function TitleSlide({
  request,
  requestId,
  matchCount,
}: {
  request: RequestData | null;
  requestId: string;
  matchCount: number;
}) {
  return (
    <div
      className="relative rounded-lg border aspect-[16/9] overflow-hidden"
      style={{ background: PALETTE.bg, borderColor: PALETTE.border }}
    >
      {/* Left brand stripe */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: '2.5%', background: PALETTE.accent }}
      />
      <div className="h-full flex flex-col justify-between pl-[6%] pr-[6%] pt-[6%] pb-[5%]">
        <div>
          <div
            className="text-[10px] font-bold uppercase mb-3"
            style={{ color: PALETTE.accent, letterSpacing: '0.4em' }}
          >
            Privacy Compliance Report
          </div>
          <h3
            className="text-3xl font-bold leading-tight mb-2"
            style={{ color: PALETTE.fg }}
          >
            {request?.consumer_name ?? requestId}
          </h3>
          <p className="text-base" style={{ color: PALETTE.fgSecondary }}>
            {request ? requestTypeLabel(request.request_type) : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-4">
            <Pill label={requestId} color={PALETTE.accent} />
            <Pill label={request?.consumer_state || 'state n/a'} color={PALETTE.fgSecondary} />
            {request && (
              <Pill
                label={`Filed ${new Date(request.created_at).toLocaleDateString()}`}
                color={PALETTE.muted}
              />
            )}
            {request && (
              <Pill
                label={`Due ${new Date(request.deadline_at).toLocaleDateString()}`}
                color={PALETTE.warn}
              />
            )}
            <Pill label={`${matchCount} record${matchCount === 1 ? '' : 's'}`} color={PALETTE.ok} />
          </div>
          <div className="mt-3 text-[10px]" style={{ color: PALETTE.muted, letterSpacing: '0.25em' }}>
            STATUS&nbsp;&nbsp;
            <span style={{ color: PALETTE.fg }} className="font-bold">
              {(request?.status ?? 'pending').toUpperCase()}
            </span>
          </div>
        </div>
        <div>
          <div className="w-8 h-[2px] mb-1.5" style={{ background: PALETTE.accent }} />
          <div className="text-[10px]" style={{ color: PALETTE.fgSecondary }}>
            Generated {new Date().toLocaleString()}
          </div>
          <div className="text-[10px] italic" style={{ color: PALETTE.muted }}>
            Izzy · Instrata privacy compliance agent
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentSlide({
  request,
  page,
  of,
  title,
  subtitle,
  children,
}: {
  request: RequestData | null;
  page: number;
  of: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const headerRight = request
    ? `${request.id} · ${requestTypeLabel(request.request_type)} · ${request.consumer_state}`
    : '';
  const footerLeft = request ? `${request.id} · ${request.consumer_name}` : '';
  return (
    <div
      className="relative rounded-lg border aspect-[16/9] overflow-hidden flex flex-col"
      style={{ background: PALETTE.bg, borderColor: PALETTE.border }}
    >
      {/* Header strip */}
      <div
        className="flex items-center px-3 py-1.5 flex-shrink-0"
        style={{ background: PALETTE.surface }}
      >
        <div className="w-[2px] h-3 mr-2" style={{ background: PALETTE.accent }} />
        <div
          className="text-[8px] font-bold flex-1"
          style={{ color: PALETTE.fgSecondary, letterSpacing: '0.3em' }}
        >
          INSTRATA · PRIVACY COMPLIANCE
        </div>
        <div className="text-[8px]" style={{ color: PALETTE.muted }}>
          {headerRight}
        </div>
      </div>
      {/* Content area */}
      <div className="flex-1 px-5 py-4 flex flex-col min-h-0">
        <h4 className="text-lg font-bold mb-1" style={{ color: PALETTE.fg }}>
          {title}
        </h4>
        <div className="w-6 h-[3px] mb-2" style={{ background: PALETTE.accent }} />
        {subtitle && (
          <p className="text-[11px] mb-3" style={{ color: PALETTE.muted }}>
            {subtitle}
          </p>
        )}
        <div className="flex-1 min-h-0">{children}</div>
      </div>
      {/* Footer strip */}
      <div
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        style={{ background: PALETTE.surface }}
      >
        <div className="text-[8px]" style={{ color: PALETTE.muted }}>
          {footerLeft}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[8px] italic" style={{ color: PALETTE.dim }}>
            Confidential · Regulator-ready
          </div>
          <div className="text-[8px]" style={{ color: PALETTE.muted }}>
            {page} / {of}
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
      style={{ color, borderColor: color, background: PALETTE.bg }}
    >
      {label}
    </span>
  );
}

function Panel({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-md border p-3 flex flex-col', className)}
      style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
    >
      {label && (
        <div
          className="text-[9px] font-bold mb-2"
          style={{ color: PALETTE.accent, letterSpacing: '0.25em' }}
        >
          {label}
        </div>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ─── Per-slide bodies ───────────────────────────────────────────────────

function SummarySlideBody({
  request,
  rule,
  matchCount,
}: {
  request: RequestData | null;
  rule: ReturnType<typeof getComplianceRules>;
  matchCount: number;
}) {
  const facts: Array<[string, string]> = request
    ? [
        ['Consumer', request.consumer_name || '—'],
        ['Email', request.consumer_email ?? '—'],
        ['State', request.consumer_state || '—'],
        ['Request type', requestTypeLabel(request.request_type)],
        ['Filed', new Date(request.created_at).toLocaleDateString()],
        ['Deadline', new Date(request.deadline_at).toLocaleDateString()],
        ['Status', request.status],
        ['Records matched', `${matchCount} across source systems`],
      ]
    : [];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <Panel label="REQUEST">
        <div className="flex flex-col gap-1">
          {facts.map(([k, v]) => (
            <div key={k} className="flex items-baseline">
              <div
                className="w-1/3 text-[9px] font-bold pr-2"
                style={{ color: PALETTE.muted, letterSpacing: '0.15em' }}
              >
                {k.toUpperCase()}
              </div>
              <div className="flex-1 text-[11px] truncate" style={{ color: PALETTE.fg }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel label="CONTROLLING STATUTE">
        {rule && request ? (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-bold" style={{ color: PALETTE.fg }}>
              {request.consumer_state} · {requestTypeLabel(request.request_type)}
            </div>
            <div
              className="inline-flex self-start px-2 py-1 rounded-md text-[10px] font-bold border"
              style={{ color: PALETTE.accent, borderColor: PALETTE.accent, background: PALETTE.bg }}
            >
              {rule.deadline_days}-day response
            </div>
            <div
              className="text-[9px] font-bold mt-1"
              style={{ color: PALETTE.muted, letterSpacing: '0.2em' }}
            >
              REQUIRED DISCLOSURES
            </div>
            <ul className="space-y-0.5 text-[10px]" style={{ color: PALETTE.fgSecondary }}>
              {rule.required_disclosures.length > 0 ? (
                rule.required_disclosures.slice(0, 4).map((d) => <li key={d}>• {d}</li>)
              ) : (
                <li>• None enumerated by statute</li>
              )}
            </ul>
            <div
              className="text-[9px] font-bold mt-1"
              style={{ color: PALETTE.muted, letterSpacing: '0.2em' }}
            >
              STATUTORY EXCEPTIONS
            </div>
            <div className="text-[10px]" style={{ color: PALETTE.fgSecondary }}>
              {rule.exceptions?.length ?? 0} carve-out{rule.exceptions?.length === 1 ? '' : 's'} considered during disposition planning
            </div>
          </div>
        ) : (
          <div className="text-[11px] italic" style={{ color: PALETTE.muted }}>
            No rule found for this state/request type.
          </div>
        )}
      </Panel>
    </div>
  );
}

function RecordsSlideBody({
  matches,
  lookupRecord,
  sourcesHit,
  ambiguousCount,
}: {
  matches: MatchData[];
  lookupRecord: (id: string) => RecordData | undefined;
  sourcesHit: number;
  ambiguousCount: number;
}) {
  if (matches.length === 0) {
    return (
      <div
        className="rounded-md border p-4 text-[12px] italic flex items-center justify-center h-full"
        style={{ background: PALETTE.surface, borderColor: PALETTE.border, color: PALETTE.muted }}
      >
        No records matched in the source systems for this request.
      </div>
    );
  }

  const stats: Array<[string, string, string]> = [
    [String(matches.length), 'RECORDS', PALETTE.fg],
    [String(sourcesHit), 'SOURCES', PALETTE.accent],
    [String(ambiguousCount), 'AMBIGUOUS', ambiguousCount > 0 ? PALETTE.warn : PALETTE.muted],
  ];

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([num, label, color]) => (
          <div
            key={label}
            className="rounded-md border px-2 py-1.5 text-center"
            style={{ background: PALETTE.surface, borderColor: PALETTE.border }}
          >
            <div className="text-xl font-bold leading-none" style={{ color }}>
              {num}
            </div>
            <div
              className="text-[8px] font-bold mt-0.5"
              style={{ color: PALETTE.muted, letterSpacing: '0.2em' }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden rounded-md border" style={{ borderColor: PALETTE.border }}>
        <table className="w-full text-[10px]">
          <thead style={{ background: PALETTE.surface }}>
            <tr>
              <th className="text-left px-2 py-1 font-bold" style={{ color: PALETTE.accent, letterSpacing: '0.1em' }}>
                SOURCE
              </th>
              <th className="text-left px-2 py-1 font-bold" style={{ color: PALETTE.accent, letterSpacing: '0.1em' }}>
                RECORD ID
              </th>
              <th className="text-left px-2 py-1 font-bold" style={{ color: PALETTE.accent, letterSpacing: '0.1em' }}>
                SCORE
              </th>
              <th className="text-left px-2 py-1 font-bold" style={{ color: PALETTE.accent, letterSpacing: '0.1em' }}>
                DISPOSITION
              </th>
            </tr>
          </thead>
          <tbody>
            {matches.slice(0, 8).map((m, i) => {
              const rec = lookupRecord(m.record_id);
              const disp = dispositionStyle(m.disposition);
              const zebra = i % 2 === 0 ? PALETTE.bg : PALETTE.surface2;
              return (
                <tr key={m.id} style={{ background: zebra }}>
                  <td className="px-2 py-1" style={{ color: PALETTE.fg }}>
                    {rec?.data_source ?? '—'}
                  </td>
                  <td className="px-2 py-1 font-mono" style={{ color: PALETTE.fgSecondary }}>
                    {m.record_id}
                  </td>
                  <td className="px-2 py-1 font-mono" style={{ color: PALETTE.fg }}>
                    {m.match_score}/4
                  </td>
                  <td className="px-2 py-1 font-mono" style={{ color: disp.color }}>
                    {disp.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {matches.length > 8 && (
        <div className="text-right text-[9px] italic" style={{ color: PALETTE.dim }}>
          + {matches.length - 8} additional record{matches.length - 8 === 1 ? '' : 's'} not shown
        </div>
      )}
    </div>
  );
}

function DispositionSlideBody({ body }: { body: string }) {
  return (
    <div
      className="rounded-md border h-full p-4 text-[10.5px] leading-relaxed whitespace-pre-wrap overflow-y-auto"
      style={{ background: PALETTE.surface, borderColor: PALETTE.border, color: PALETTE.fgSecondary }}
    >
      {body}
    </div>
  );
}

function EmailPreview({ email, onClose }: { email: PipelineEmail; onClose: () => void }) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold">Email — sent</h2>
            <p className="text-[11px] text-muted-foreground font-mono">{email.message_id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Email envelope */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border/60 px-4 py-3 text-[12px] space-y-1">
          <EnvelopeRow label="From" value="izzy@instrata.demo" />
          <EnvelopeRow label="To" value={`${email.to_name} <${email.to}>`} />
          <EnvelopeRow label="Subject" value={email.subject} bold />
        </div>

        {/* Body */}
        <div className="px-4 py-4 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
          {email.body_preview}
        </div>

        {/* Attachments */}
        {email.attachments.length > 0 && (
          <div className="border-t border-border/60 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
              Attachments ({email.attachments.length})
            </div>
            <ul className="space-y-1.5">
              {email.attachments.map((filename) => (
                <li
                  key={filename}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[12px] text-foreground"
                >
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate font-mono text-[11.5px]">{filename}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground bg-muted/20">
        Read-only preview — message is a fixture for the demo. In production this would have been
        sent via SendGrid with a tracked message-id.
      </div>
    </>
  );
}

function EnvelopeRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-14 flex-shrink-0 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        {label}
      </span>
      <span className={cn('flex-1', bold && 'font-semibold')}>{value}</span>
    </div>
  );
}

