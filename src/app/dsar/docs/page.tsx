import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/dsar/shared/LogoMark';
import { Toc } from '@/components/dsar/docs/Toc';
import { PipelineDiagram } from '@/components/dsar/docs/PipelineDiagram';
import { DocSection, type DocSectionData } from '@/components/dsar/docs/DocSection';

const SECTIONS: DocSectionData[] = [
  {
    id: 'intake',
    n: '1',
    title: 'Intake',
    tone: 'dark',
    body: 'The consumer-facing portal captures request type, identity, jurisdiction, and verification details. Each submission is normalized into a request record and placed in the operator queue with an SLA clock derived from the applicable jurisdiction.',
    items: [
      { k: 'Request record', v: 'type, consumer, jurisdiction, verification state' },
      { k: 'SLA clock', v: 'statutory deadline set on receipt' },
      { k: 'Queue placement', v: 'status = new, awaiting verification' },
    ],
  },
  {
    id: 'orchestration',
    n: '2',
    title: 'Request orchestration',
    tone: 'dark',
    body: "Orchestration turns a verified request into a plan of read-only steps. It decides which source systems to query, invokes the agent's tools in sequence, and collects results and reasoning — without ever performing an external action on its own.",
    code: 'plan = orchestrate(request)\n  → verify_identity()\n  → search_sources(identity)\n  → reason_matches(results)\n  → propose_action()   // gated, not executed',
  },
  {
    id: 'tools',
    n: '3',
    title: 'Agent tools',
    tone: 'accent',
    body: 'Tools are the only way the agent interacts with data, and each is explicitly typed as read-only or side-effecting. Read-only tools run freely and are logged; side-effecting tools are registered as proposals that require approval.',
    items: [
      { k: 'search_sources()', v: 'read-only lookup across connectors' },
      { k: 'reason_matches()', v: 'explain confidence per record' },
      { k: 'propose_action()', v: 'draft a gated side effect' },
    ],
  },
  {
    id: 'connectors',
    n: '4',
    title: 'Source-system connectors',
    tone: 'accent',
    body: 'Each connected system — billing, CRM, support, marketing — implements a small connector interface. Connectors declare their search capability and mark whether they can produce side effects, which the runtime always treats as gated.',
    code: 'registerConnector("crm", {\n  search: async (identity) => { /* read-only */ },\n  sideEffects: "gated",   // never auto-run\n  audit: true\n})',
  },
  {
    id: 'evidence',
    n: '5',
    title: 'Evidence & audit layer',
    tone: 'dark',
    body: 'Every input, tool call, result, reasoning step, and human decision is appended to an immutable audit trail keyed to the request. The evidence log is what makes a completed DSAR defensible on audit — it shows exactly what happened and who decided it.',
    items: [
      { k: 'Append-only', v: 'entries are never edited or deleted' },
      { k: 'Attributed', v: 'each decision records the operator' },
      { k: 'Exportable', v: 'full trail attaches to the request' },
    ],
  },
  {
    id: 'gates',
    n: '6',
    title: 'Approval gates',
    tone: 'success',
    body: 'A gate sits in front of every side effect. When the agent proposes an action, the operator sees the reasoning, the evidence, and the exact operation, then approves, rejects, or requests changes. Only an approval releases the action for execution.',
    code: 'action.status = "proposed"\nif (operator.approves(action)) {\n  execute(action)          // email / export / delete\n  audit.append("approved", operator)\n}',
  },
];

export default function DsarDocsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--line-soft-3))] bg-[hsl(var(--background))]/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1200px] items-center gap-7 px-8 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <LogoMark size={24} />
            Instrata AI
          </Link>
          <span className="font-mono text-[13px] text-[hsl(var(--text-faint))]">docs / architecture</span>
          <div className="ml-auto flex items-center gap-3.5">
            <Button asChild variant="outline" className="gap-1.5 rounded-[9px] border-[hsl(var(--input))] font-semibold hover:border-foreground">
              <a href="https://github.com" target="_blank" rel="noreferrer">
                <span className="font-mono text-xs">★</span> GitHub
              </a>
            </Button>
            <Button asChild className="rounded-[9px] bg-primary font-semibold hover:bg-[hsl(var(--accent-foreground))]">
              <Link href="/dsar/demo">View the Demo</Link>
            </Button>
          </div>
        </nav>
      </header>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-12 px-8 py-12 lg:grid-cols-[220px_1fr]">
        <Toc />

        <main className="min-w-0">
          <div id="overview">
            <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
              Architecture
            </div>
            <h1 className="mt-3 text-[36px] font-extrabold tracking-[-0.02em] text-foreground">
              How the open-source demo works
            </h1>
            <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.6] text-[hsl(var(--text-body))]">
              Instrata orchestrates a DSAR from consumer intake to an approved action. The agent handles
              search and reasoning; humans hold every gate that produces a side effect. Below is each layer
              of the pipeline.
            </p>
            <PipelineDiagram />
          </div>

          {SECTIONS.map((section) => (
            <DocSection key={section.id} section={section} />
          ))}

          <div className="mt-11 flex items-start gap-3.5 rounded-2xl border border-[hsl(var(--success-tint-border))] bg-[hsl(var(--success-tint))] px-6 py-[22px]">
            <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg bg-[hsl(var(--success))] text-sm font-extrabold text-white">
              ✓
            </span>
            <div>
              <div className="text-[15px] font-bold text-foreground">No side effects without human approval</div>
              <div className="mt-1.5 text-sm leading-[1.55] text-[hsl(var(--success-hover))]">
                The agent&apos;s tools are read-only. Any operation that leaves the system — email, export,
                deletion — is registered as a gated side effect and cannot run until an operator approves it
                in the dashboard.
              </div>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap gap-3.5">
            <Button asChild className="rounded-[11px] bg-primary text-[15px] font-semibold hover:bg-[hsl(var(--accent-foreground))]">
              <Link href="/dsar/demo">See it in the demo →</Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 rounded-[11px] border-[hsl(var(--input))] text-[15px] font-semibold hover:border-foreground">
              <a href="https://github.com" target="_blank" rel="noreferrer">
                <span className="font-mono text-[13px]">★</span> Read the source
              </a>
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
