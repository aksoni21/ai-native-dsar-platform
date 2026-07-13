import { AuditRow } from '../shared/AuditRow';

const CHECKS = [
  { title: 'Inspect before approve', rest: 'full reasoning and evidence for each proposed action.' },
  { title: 'Approval gates', rest: 'block all external side effects until a human signs off.' },
  { title: 'Immutable audit trail', rest: 'records who decided what, when, and on what basis.' },
];

const AUDIT_ROWS = [
  { t: '09:42', tag: 'intake', tagBg: 'rgba(127,165,255,.15)', tagFg: '#7FA5FF', text: 'Request received · Right to Know · CA' },
  { t: '09:42', tag: 'verify', tagBg: 'rgba(95,211,166,.15)', tagFg: '#5FD3A6', text: 'Identity verified via email + DOB' },
  { t: '09:43', tag: 'tool', tagBg: 'rgba(224,166,75,.15)', tagFg: '#E0A64B', text: 'search() → 4 systems, 3 matches' },
  { t: '09:43', tag: 'reason', tagBg: 'rgba(127,165,255,.15)', tagFg: '#7FA5FF', text: 'Matched on email + last name (high)' },
  { t: '09:44', tag: 'gate', tagBg: 'rgba(224,166,75,.15)', tagFg: '#E0A64B', text: 'Awaiting approval · compile disclosure' },
];

export function GovernanceSection() {
  return (
    <section id="governance" className="bg-[hsl(var(--foreground))] text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-8 py-[84px] lg:grid-cols-2">
        <div>
          <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[hsl(var(--accent-on-dark))]">
            Governance
          </div>
          <h2 className="mt-3.5 text-[38px] font-extrabold leading-[1.08] tracking-[-0.02em] text-white">
            The agent assists. It never acts on its own.
          </h2>
          <p className="mt-[18px] text-[17px] leading-[1.6] text-[#B7BDCC]">
            Every side effect — an email to a consumer, a data export, a deletion — is approval-gated.
            Operators inspect the reasoning, the evidence, and the exact proposed action before anything
            happens.
          </p>
          <div className="mt-7 flex flex-col gap-3.5">
            {CHECKS.map((c) => (
              <div key={c.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[hsl(var(--success)_/_0.18)] text-xs font-extrabold text-[hsl(var(--success-on-dark))]">
                  ✓
                </span>
                <div className="text-[15px] text-[#D6DAE6]">
                  <b className="text-white">{c.title}</b> — {c.rest}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--ink-border))] bg-[hsl(var(--ink-soft))]">
          <div className="border-b border-[hsl(var(--ink-border))] px-4 py-3.5 font-mono text-xs text-[hsl(var(--text-faint))]">
            audit_trail · DSAR-2041
          </div>
          <div className="py-2">
            {AUDIT_ROWS.map((row, i) => (
              <AuditRow key={i} {...row} dark />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
