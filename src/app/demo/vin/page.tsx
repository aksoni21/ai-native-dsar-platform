'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import vinData from '@/data/vin_demo_records.json';

/**
 * /demo/vin — Sample data for the 2-step VIN lookup. Compact view.
 */
export default function VinDemoPage() {
  const { consumer, ownership_window, step1_systems, step2_systems, orphan_vins_sample } = vinData;
  return (
    <div className="dark min-h-dvh bg-[#060912] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-[#060912]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between text-sm">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <span className="font-display tracking-wide text-white/80">2-Step VIN Lookup — sample data</span>
          <Link href="/demo" className="rounded-full bg-amber-400 text-black px-3 py-1 hover:bg-amber-300">
            Live demo →
          </Link>
        </div>
      </header>

      {/* Hero strip */}
      <section className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm border-b border-white/10">
        <div>
          <span className="text-white/40 text-xs uppercase tracking-wider mr-2">Subject</span>
          <span className="font-display text-base">{consumer.first_name} {consumer.last_name}</span>
          <span className="text-white/40 ml-2">· {consumer.request_id}</span>
        </div>
        <div>
          <span className="text-white/40 text-xs uppercase tracking-wider mr-2">VIN</span>
          <span className="font-mono text-amber-300">{ownership_window.vin}</span>
        </div>
        <div>
          <span className="text-white/40 text-xs uppercase tracking-wider mr-2">Owned</span>
          <span className="text-emerald-300 font-mono">{ownership_window.start_date} → {ownership_window.end_date}</span>
        </div>
      </section>

      {/* Step 1 */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <Heading kicker="Step 1" title="Name-keyed systems" sub="Search by name + email finds these. The dealer record gives us the VIN + ownership dates." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {Object.entries(step1_systems).map(([key, sys]) => (
            <CompactCard key={key} sys={sys} highlight={key === 'DealerRecords'} />
          ))}
        </div>
      </section>

      {/* Bridge */}
      <section className="mx-auto max-w-6xl px-6 py-2 -my-2">
        <div className="rounded-md border border-amber-400/30 bg-amber-400/[0.05] p-3 text-sm flex items-center gap-3">
          <ArrowRight className="size-4 text-amber-400 shrink-0" />
          <span className="font-mono">
            <span className="text-white">John Brown</span>
            <span className="text-white/40"> = </span>
            <span className="text-amber-300">{ownership_window.vin}</span>
            <span className="text-white/40"> · </span>
            <span className="text-emerald-300">{ownership_window.start_date} → {ownership_window.end_date}</span>
          </span>
          <span className="text-white/50 ml-auto text-xs">→ feed into Step 2</span>
        </div>
      </section>

      {/* Step 2 */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <Heading kicker="Step 2" title="VIN-only systems" sub="No names here. Search by VIN, then exclude records outside John's ownership window." />
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {Object.entries(step2_systems).map(([key, sys]) => (
            <VinOnlyCard key={key} sys={sys} />
          ))}
        </div>
      </section>

      {/* Orphans */}
      <section className="mx-auto max-w-6xl px-6 py-8 border-t border-white/10">
        <Heading
          kicker="Leftover"
          title="Orphan VINs"
          sub="No person attached anywhere. The 2-step pivot can't help — fix is a scheduled hygiene sweep."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {orphan_vins_sample.map((o) => (
            <div key={o.vin} className="rounded-md border border-rose-400/20 bg-rose-400/[0.04] p-3 text-xs">
              <div className="flex items-center gap-1.5 text-rose-300 mb-1.5">
                <AlertTriangle className="size-3" />
                <span className="uppercase tracking-wider text-[10px]">Orphan</span>
              </div>
              <div className="font-mono text-amber-300 break-all mb-1.5">{o.vin}</div>
              <div className="text-white/70">{o.record_count.toLocaleString()} records · {o.source_systems.length} systems</div>
              <div className="text-white/40 italic mt-1.5 text-[11px] leading-snug">{o.likely_cause}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-4 text-xs text-white/40 text-center">
        Sample data for the 2-step VIN lookup demo · Part 2 prep
      </footer>
    </div>
  );
}

/* ---------- Helpers ------------------------------------------------------- */

function Heading({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div>
      <div className="text-amber-400/70 uppercase tracking-[0.2em] text-[10px]">{kicker}</div>
      <div className="flex items-baseline gap-3 mt-0.5">
        <h2 className="font-display text-xl">{title}</h2>
        <span className="text-white/50 text-sm">— {sub}</span>
      </div>
    </div>
  );
}

type SysShape = {
  label: string;
  keying: string;
  records: Array<Record<string, unknown>>;
  summary?: {
    total_records_for_vin?: number;
    in_window_count?: number;
    pre_ownership_count?: number;
    post_ownership_count?: number;
    note?: string;
  };
};

function CompactCard({ sys, highlight }: { sys: SysShape; highlight?: boolean }) {
  const r = sys.records[0];
  // Highlighted (dealer) card leads with VIN since that's the bridge into Step 2.
  const keys = highlight
    ? ['vin', 'transaction_date', 'event', 'first_name', 'last_name']
    : ['first_name', 'last_name', 'email', 'service_type', 'service_date'];
  return (
    <div
      className={`rounded-md p-3 text-xs ${
        highlight ? 'border border-amber-400/40 bg-amber-400/[0.05]' : 'border border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="font-display text-sm mb-0.5">{sys.label}</div>
      <div className="text-white/40 text-[10px] uppercase tracking-wider mb-2">{sys.keying}</div>
      <div className="font-mono text-[11px] text-white/70 leading-snug break-all">
        <Field record={r} keys={keys} />
      </div>
      {sys.records.length > 1 && (
        <div className="text-white/40 text-[10px] mt-2">+ {sys.records.length - 1} more</div>
      )}
    </div>
  );
}

function VinOnlyCard({ sys }: { sys: SysShape }) {
  const total = sys.summary?.total_records_for_vin;
  const inWin = sys.summary?.in_window_count ?? 0;
  const excluded = (sys.summary?.pre_ownership_count ?? 0) + (sys.summary?.post_ownership_count ?? 0);
  const inSample = sys.records.find((r) => (r as { in_window?: boolean }).in_window === true);
  const exSample = sys.records.find((r) => (r as { in_window?: boolean }).in_window === false);

  return (
    <div className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.03] p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-display text-sm">{sys.label}</div>
          <div className="text-cyan-200/60 text-[10px] uppercase tracking-wider">{sys.keying}</div>
        </div>
        {total !== undefined && (
          <div className="text-right text-[11px] leading-tight">
            <div>
              <span className="text-emerald-300 font-mono">{inWin.toLocaleString()}</span>
              <span className="text-white/40"> in</span>
            </div>
            <div>
              <span className="text-rose-300 font-mono">{excluded.toLocaleString()}</span>
              <span className="text-white/40"> out</span>
            </div>
          </div>
        )}
      </div>

      {inSample && <RecordLine record={inSample} kind="in" />}
      {exSample && <RecordLine record={exSample} kind="out" />}

      {sys.summary?.note && <div className="text-white/50 italic mt-2 text-[11px] leading-snug">{sys.summary.note}</div>}
    </div>
  );
}

function RecordLine({ record, kind }: { record: Record<string, unknown>; kind: 'in' | 'out' }) {
  const reason = (record as { exclusion_reason?: string }).exclusion_reason;
  const ts = String(record.timestamp ?? record.service_date ?? record.notice_date ?? record.build_date ?? '');
  const detail =
    (record.fault_code as string) ||
    (record.event as string) ||
    (record.service_type as string) ||
    (record.campaign as string) ||
    (record.test as string) ||
    (record.type as string) ||
    '';
  return (
    <div className={`mt-1.5 rounded bg-black/40 px-2 py-1.5 font-mono text-[11px] ${kind === 'out' ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/80 truncate">
          <span className="text-amber-300/80">vin</span> {String(record.vin)} · <span className="text-white/40">{ts}</span> · {detail}
        </span>
        <span
          className={`shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
            kind === 'in' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          {kind === 'in' ? 'in' : 'out'}
        </span>
      </div>
      {kind === 'out' && reason && <div className="text-rose-200/60 text-[10px] mt-0.5">⨯ {reason}</div>}
    </div>
  );
}

function Field({ record, keys }: { record: Record<string, unknown>; keys: string[] }) {
  const present = keys.filter((k) => record[k] !== undefined && record[k] !== null);
  return (
    <>
      {present.slice(0, 3).map((k) => (
        <div key={k}>
          <span className="text-white/40">{k}: </span>
          <span className={k === 'vin' ? 'text-amber-300' : 'text-white/85'}>{String(record[k])}</span>
        </div>
      ))}
    </>
  );
}
