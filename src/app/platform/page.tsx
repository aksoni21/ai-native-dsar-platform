import Link from 'next/link';
import {
  Bot,
  Cable,
  CheckCircle2,
  Database,
  FileClock,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

const skills = [
  {
    name: 'DSAR triage',
    agent: 'intake-triage',
    detail: 'Classifies request type, missing verification fields, deadlines, and urgency.',
  },
  {
    name: 'Identity resolution',
    agent: 'identity-resolver',
    detail: 'Searches email, phone, name, VIN, and source records, then explains include/exclude decisions.',
  },
  {
    name: 'Disposition planning',
    agent: 'disposition-planner',
    detail: 'Maps records to disclose, delete, mask, retain, or review with statutory rationale.',
  },
  {
    name: 'Consumer reply drafting',
    agent: 'communications-coordinator',
    detail: 'Drafts and parses correspondence while keeping external sends queued for human approval.',
  },
  {
    name: 'Audit defense report',
    agent: 'report-generator',
    detail: 'Builds reviewer-ready evidence from request facts, tools used, rules applied, and approvals.',
  },
  {
    name: 'Approved execution',
    agent: 'execution-coordinator',
    detail: 'Executes side effects only after exact approval checks and trace writes pass.',
  },
];

const mcpServers = [
  ['source-systems', 'Read-only search and retrieval across CRM, warehouse, marketing, dealer, support, and telemetry connectors.'],
  ['dsar-intake', 'Request queue, deadline, verification, and status tools. Status changes are approval-gated.'],
  ['legal-rules', 'Jurisdiction rules, deadline logic, and exemption candidates as reference tools.'],
  ['communications', 'Draft, parse, match, and queue email correspondence without unsupervised sends.'],
  ['evidence-vault', 'Append-only trace and evidence retrieval for litigation-defense artifacts.'],
];

const policies = [
  ['tool-permissions.v1', 'Read-only by default, least privilege, no external messages without approval.'],
  ['approval-gates.v1', 'Exact approval phrases, action-bundle matching, authorized operator checks, trace-backed execution.'],
  ['data-classification.v1', 'Demo data allowed, personal data minimized, credentials never logged or committed.'],
];

const traceEvents = [
  'agent_started',
  'tool_call_completed',
  'record_included',
  'record_excluded',
  'legal_rule_applied',
  'draft_generated',
  'human_approval_captured',
  'side_effect_executed',
];

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-[#101624]">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
            instrata
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/demo" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              DSAR demo
            </Link>
            <Link href="/ai-gov" className="rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              AI governance
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-18">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Network className="h-3.5 w-3.5" />
              AI-native privacy operations platform
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl">
              Agents, MCP tools, policies, traces, and human approval gates in one operating layer.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              The DSAR workflow is the visible product. This page shows the platform underneath it:
              governed skills, MCP-ready system tools, a connector SDK, policy-as-code, and evidence
              traces that make AI work reviewable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Workflow className="h-4 w-4" />
                Open DSAR demo
              </Link>
              <a
                href="#platform-contracts"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FileClock className="h-4 w-4" />
                View platform contracts
              </a>
            </div>
          </div>

          <div className="grid content-start gap-3">
            {[
              ['agents/agents.yaml', 'declares governed workers, permissions, tools, and outputs'],
              ['mcp/source-systems', 'scaffolds read-only MCP tools for enterprise records'],
              ['connectors/sdk', 'normalizes CRM, warehouse, marketing, support, and custom systems'],
              ['policies/*.yaml', 'keeps approval, data handling, and tool permissions outside prompts'],
              ['tests/*.test.ts', 'locks the platform contracts with runnable checks'],
            ].map(([path, detail]) => (
              <div key={path} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-mono text-xs text-slate-500">{path}</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={<Bot className="h-5 w-5" />} label="Governed agent skills" value="6" />
          <Metric icon={<Cable className="h-5 w-5" />} label="MCP server contracts" value="5" />
          <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Policy files" value="3" />
        </div>
      </section>

      <section id="platform-contracts" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Skills as governed workers</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">The workflow is split into auditable agent skills.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              These are not free-floating prompts. Each skill maps to a declared agent, permission mode,
              tool scope, and expected output in <span className="font-mono">agents/agents.yaml</span>.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {skills.map((skill) => (
              <div key={skill.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">{skill.name}</h3>
                    <p className="mt-1 font-mono text-xs text-blue-700">{skill.agent}</p>
                  </div>
                  <Bot className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{skill.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">MCP and connectors</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Enterprise systems become narrow, typed tools.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The source-systems MCP scaffold sits in front of connector implementations. Agents search and retrieve
            normalized privacy records without knowing the vendor API behind them.
          </p>
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-blue-700" />
              Connector contract
            </div>
            <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
{`searchSubject(input) -> CandidateRecord[]
getRecord(recordId) -> PrivacyRecord
explainRecord(recordId) -> RecordProvenance`}
            </pre>
          </div>
        </div>

        <div className="grid gap-3">
          {mcpServers.map(([name, detail]) => (
            <div key={name} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Cable className="mt-0.5 h-5 w-5 flex-none text-blue-700" />
              <div>
                <div className="font-mono text-sm font-semibold text-slate-950">{name}</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Policy-as-code</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Safety lives outside the prompt.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              The model can propose. The platform decides what tools it can call, what data can be logged,
              and when a human approval is mandatory.
            </p>
          </div>
          <div className="grid gap-3">
            {policies.map(([name, detail]) => (
              <div key={name} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 font-mono text-sm font-semibold text-white">
                  <LockKeyhole className="h-4 w-4 text-blue-300" />
                  {name}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Trace and approval layer</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Every material AI action can become evidence.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            A privacy team does not just need an answer. It needs to know which records were searched,
            why they were included or excluded, which law was applied, who approved the action, and what was executed.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-950">
            <GitBranch className="h-5 w-5 text-blue-700" />
            Agent trace events
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {traceEvents.map((event) => (
              <div key={event} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-mono text-xs">{event}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" />
              Side effects require human approval
            </div>
            Emails, report delivery, status changes, deletion, masking, and vendor notification must pass
            exact approval and action-bundle checks before execution.
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-slate-500">{icon}</div>
        <div className="font-mono text-3xl font-semibold text-slate-950">{value}</div>
      </div>
      <div className="mt-4 text-sm font-medium text-slate-700">{label}</div>
    </div>
  );
}
