'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Plug,
  Compass,
  Fingerprint,
  Sparkles,
  Check,
} from 'lucide-react';
import Link from 'next/link';

/**
 * /demo/integrate — How agentic AI changes the shape of production integration.
 * Same cinematic "naica" voice as the landing page. Diagrams carry the load;
 * prose stays out of the way.
 */
export default function IntegratePage() {
  return (
    <div className="dark min-h-dvh bg-[#060912] text-white">
      <Hero />
      <BeforeAfterSection />
      <ThreeShifts />
      <ReadWriteSplit />
      <OnboardingTimeline />
      <CtaFooter />
    </div>
  );
}

/* ---------- Hero ---------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero-tunnel-snow.jpg)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,9,18,0.82) 0%, rgba(6,9,18,0.55) 45%, rgba(6,9,18,0.95) 100%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Link
          href="/demo"
          className="group mb-8 inline-flex items-center gap-1.5 text-[12px] font-medium text-white/65 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to demo
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 backdrop-blur"
        >
          <Sparkles className="h-3 w-3 text-[hsl(220_100%_75%)]" />
          Production integration
        </motion.div>

        <h1
          className="font-display max-w-4xl drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]"
          style={{
            fontSize: 'clamp(2.4rem, 6vw, 5rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
          }}
        >
          Not a project.{' '}
          <span style={{ color: 'hsl(40 90% 75%)' }}>A connector.</span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
          Salesforce, C360, Snowflake, vehicle services, dealer DMS — the
          agent learns each system on contact. The only thing you build is auth.
        </p>
      </div>
    </section>
  );
}

/* ---------- Before / After ------------------------------------------------ */

function BeforeAfterSection() {
  return (
    <section className="border-t border-white/5 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHead num="01" title="Six adapters, or one protocol." />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <BeforeDiagram />
          <AfterDiagram />
        </div>
      </div>
    </section>
  );
}

function DiagramCard({
  badge,
  badgeTone,
  title,
  cost,
  costLabel,
  children,
}: {
  badge: string;
  badgeTone: 'warn' | 'good';
  title: string;
  cost: string;
  costLabel: string;
  children: React.ReactNode;
}) {
  const badgeColor =
    badgeTone === 'warn'
      ? 'bg-amber-400/15 text-amber-200 ring-amber-400/30'
      : 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30';
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${badgeColor}`}
        >
          {badge}
        </span>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {costLabel}
          </div>
          <div className="font-mono text-sm font-semibold text-white/85">
            {cost}
          </div>
        </div>
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

const SYSTEMS = [
  'Salesforce',
  'C360',
  'Snowflake',
  'Vehicle Services',
  'Dealer DMS',
  'PBS',
];

function BeforeDiagram() {
  return (
    <DiagramCard
      badge="Today"
      badgeTone="warn"
      title="A custom connector per system"
      cost="4–8 weeks each"
      costLabel="Per integration"
    >
      <svg viewBox="0 0 480 280" className="h-auto w-full" role="img" aria-label="Tangled custom connectors">
        <defs>
          <linearGradient id="warnLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(251 191 36)" stopOpacity="0.55" />
            <stop offset="1" stopColor="rgb(251 191 36)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <g>
          <rect x="190" y="18" width="100" height="36" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" />
          <text x="240" y="40" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
            Instrata DSAR
          </text>
        </g>

        {SYSTEMS.map((_, i) => {
          const x = 30 + i * 75;
          return (
            <g key={i}>
              <rect
                x={x}
                y="120"
                width="50"
                height="22"
                rx="4"
                fill="rgba(251,191,36,0.06)"
                stroke="rgba(251,191,36,0.45)"
                strokeDasharray="3 3"
              />
              <text x={x + 25} y="135" textAnchor="middle" fill="rgb(251 191 36)" fontSize="8.5" fontWeight="600">
                ADAPTER
              </text>
            </g>
          );
        })}

        {SYSTEMS.map((_, i) => {
          const targetX = 30 + i * 75 + 25;
          return (
            <path
              key={`top-${i}`}
              d={`M 240 54 C 240 90, ${targetX} 90, ${targetX} 120`}
              stroke="url(#warnLine)"
              strokeWidth="1.2"
              fill="none"
            />
          );
        })}

        {SYSTEMS.map((s, i) => {
          const x = 30 + i * 75;
          return (
            <g key={s}>
              <rect
                x={x}
                y="210"
                width="50"
                height="38"
                rx="6"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.18)"
              />
              <text x={x + 25} y="232" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="8.5" fontWeight="500">
                {s.length > 8 ? s.split(' ')[0] : s}
              </text>
              {s.includes(' ') && (
                <text x={x + 25} y="241" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="7">
                  {s.split(' ').slice(1).join(' ')}
                </text>
              )}
            </g>
          );
        })}

        {SYSTEMS.map((_, i) => {
          const x = 30 + i * 75 + 25;
          return (
            <line
              key={`bot-${i}`}
              x1={x}
              y1="142"
              x2={x}
              y2="210"
              stroke="rgba(251,191,36,0.4)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          );
        })}
      </svg>
    </DiagramCard>
  );
}

function AfterDiagram() {
  return (
    <DiagramCard
      badge="MCP-native"
      badgeTone="good"
      title="One protocol every system speaks"
      cost="1–3 days each"
      costLabel="Per integration"
    >
      <svg viewBox="0 0 480 280" className="h-auto w-full" role="img" aria-label="MCP-native fan-out">
        <defs>
          <linearGradient id="goodLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(110 231 183)" stopOpacity="0.7" />
            <stop offset="1" stopColor="rgb(110 231 183)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        <g>
          <rect x="190" y="18" width="100" height="36" rx="8" fill="rgba(110,231,183,0.08)" stroke="rgba(110,231,183,0.5)" />
          <text x="240" y="33" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
            Instrata
          </text>
          <text x="240" y="46" textAnchor="middle" fill="rgba(110,231,183,0.85)" fontSize="9">
            agent
          </text>
        </g>

        <g>
          <rect
            x="30"
            y="118"
            width="420"
            height="28"
            rx="14"
            fill="rgba(110,231,183,0.06)"
            stroke="rgba(110,231,183,0.5)"
          />
          <text x="240" y="136" textAnchor="middle" fill="rgb(110 231 183)" fontSize="10" fontWeight="700" letterSpacing="2">
            MCP · MODEL CONTEXT PROTOCOL
          </text>
        </g>

        <line x1="240" y1="54" x2="240" y2="118" stroke="url(#goodLine)" strokeWidth="2" />

        {SYSTEMS.map((_, i) => {
          const x = 30 + i * 75 + 25;
          return (
            <line
              key={`mcp-${i}`}
              x1={x}
              y1="146"
              x2={x}
              y2="210"
              stroke="rgba(110,231,183,0.55)"
              strokeWidth="1.4"
            />
          );
        })}

        {SYSTEMS.map((s, i) => {
          const x = 30 + i * 75;
          return (
            <g key={s}>
              <rect
                x={x}
                y="210"
                width="50"
                height="38"
                rx="6"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.22)"
              />
              <text x={x + 25} y="232" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="8.5" fontWeight="500">
                {s.length > 8 ? s.split(' ')[0] : s}
              </text>
              {s.includes(' ') && (
                <text x={x + 25} y="241" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="7">
                  {s.split(' ').slice(1).join(' ')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </DiagramCard>
  );
}

/* ---------- Three Shifts -------------------------------------------------- */

function ThreeShifts() {
  return (
    <section className="border-t border-white/5 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHead num="02" title="What changes." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <ShiftCard
            icon={Plug}
            title="MCP as the contract"
            after="Each system exposes an MCP endpoint. Same shape, every time."
          />
          <ShiftCard
            icon={Compass}
            title="Schema-aware discovery"
            after="Agent reads the data dictionary at request time. No pre-mapped fields."
          />
          <ShiftCard
            icon={Fingerprint}
            title="Identity as reasoning"
            after="Fuzzy-match across systems. Human approves the ambiguous ones."
          />
        </div>
      </div>
    </section>
  );
}

function ShiftCard({
  icon: Icon,
  title,
  after,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  after: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/15">
        <Icon className="h-4 w-4 text-white/85" />
      </span>
      <h3 className="mt-4 text-base font-semibold leading-snug text-white">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-white/70">{after}</p>
    </motion.div>
  );
}

/* ---------- Read/Write Split (the architecture pitch) -------------------- */

function ReadWriteSplit() {
  return (
    <section className="border-t border-white/5 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          num="03"
          title="The agent reads. Humans approve. The pipeline writes."
        />
        <div className="mt-10">
          <RWSplitDiagram />
        </div>
      </div>
    </section>
  );
}

function RWSplitDiagram() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur md:p-10">
      <svg viewBox="0 0 900 420" className="h-auto w-full" role="img" aria-label="Read/write architecture split">
        <defs>
          <linearGradient id="readZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(110,231,183,0.08)" />
            <stop offset="1" stopColor="rgba(110,231,183,0.02)" />
          </linearGradient>
          <linearGradient id="writeZone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(244,114,182,0.04)" />
            <stop offset="1" stopColor="rgba(244,114,182,0.10)" />
          </linearGradient>
          <marker id="arrowGate" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.85)" />
          </marker>
        </defs>

        <rect x="20" y="40" width="380" height="340" rx="14" fill="url(#readZone)" stroke="rgba(110,231,183,0.35)" strokeDasharray="6 4" />
        <text x="40" y="72" fill="rgb(110 231 183)" fontSize="11" fontWeight="700" letterSpacing="2">
          READ ZONE · MCP
        </text>

        <g>
          <rect x="135" y="100" width="150" height="50" rx="10" fill="rgba(110,231,183,0.10)" stroke="rgba(110,231,183,0.55)" />
          <text x="210" y="123" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">Claude agent</text>
          <text x="210" y="140" textAnchor="middle" fill="rgba(110,231,183,0.85)" fontSize="10">read-only</text>
        </g>

        {[
          'get_request_details',
          'search_consumer',
          'decode_field',
          'get_audit_trail',
          'summarize_disposition',
        ].map((tool, i) => (
          <g key={tool}>
            <rect
              x="60"
              y={180 + i * 36}
              width="300"
              height="26"
              rx="6"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(110,231,183,0.35)"
            />
            <text x="74" y={197 + i * 36} fill="rgba(255,255,255,0.85)" fontSize="11.5" fontFamily="monospace">
              {tool}()
            </text>
            <text x="346" y={197 + i * 36} textAnchor="end" fill="rgba(110,231,183,0.7)" fontSize="9" fontWeight="600">
              READ
            </text>
          </g>
        ))}

        <g>
          <rect x="410" y="180" width="80" height="80" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.55)" />
          <text x="450" y="212" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">HUMAN</text>
          <text x="450" y="228" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">APPROVAL</text>
          <text x="450" y="248" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9">always</text>
        </g>

        <line
          x1="285" y1="220"
          x2="408" y2="220"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          markerEnd="url(#arrowGate)"
        />
        <text x="346" y="212" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9.5" fontStyle="italic">
          recommends
        </text>

        <rect x="500" y="40" width="380" height="340" rx="14" fill="url(#writeZone)" stroke="rgba(244,114,182,0.4)" strokeDasharray="6 4" />
        <text x="520" y="72" fill="rgb(244 114 182)" fontSize="11" fontWeight="700" letterSpacing="2">
          WRITE ZONE · DETERMINISTIC
        </text>

        <g>
          <rect x="615" y="100" width="150" height="50" rx="10" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.55)" />
          <text x="690" y="123" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">Execution pipeline</text>
          <text x="690" y="140" textAnchor="middle" fill="rgba(244,114,182,0.85)" fontSize="10">Claude blind</text>
        </g>

        <line
          x1="492" y1="220"
          x2="615" y2="148"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          markerEnd="url(#arrowGate)"
        />
        <text x="565" y="178" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9.5" fontStyle="italic">
          approve
        </text>

        {[
          'mask_record()',
          'delete_record()',
          'update_request_status()',
          'send_consumer_notification()',
          'write_audit_entry()',
        ].map((tool, i) => (
          <g key={tool}>
            <rect
              x="540"
              y={180 + i * 36}
              width="300"
              height="26"
              rx="6"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(244,114,182,0.4)"
            />
            <text x="554" y={197 + i * 36} fill="rgba(255,255,255,0.85)" fontSize="11.5" fontFamily="monospace">
              {tool}
            </text>
            <text x="826" y={197 + i * 36} textAnchor="end" fill="rgba(244,114,182,0.75)" fontSize="9" fontWeight="600">
              WRITE
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Onboarding Timeline ------------------------------------------ */

function OnboardingTimeline() {
  const phases = [
    { when: 'Day 1', body: 'Shadow mode on a Salesforce sandbox.' },
    { when: 'Week 1', body: 'Add a second system. Identity resolution spans both.' },
    { when: 'Week 2', body: 'Parallel run on real intake. Privacy team approves.' },
    { when: 'Month 1', body: 'Cutover. Legacy queue stays as fallback for 30 days.' },
  ];

  return (
    <section className="border-t border-white/5 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHead num="04" title="Shadow → parallel → cutover." />
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {phases.map((p, i) => (
            <motion.li
              key={p.when}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
            >
              <div
                className="text-xl font-semibold"
                style={{ color: 'hsl(40 90% 75%)' }}
              >
                {p.when}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                {p.body}
              </p>
            </motion.li>
          ))}
        </ol>

        <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-white/55">
          <span className="text-white/75">Tradeoff:</span> probabilistic
          discovery instead of pre-mapped fields. Mitigated by shadow mode and
          the human approval gate.
        </p>
      </div>
    </section>
  );
}

/* ---------- CTA Footer --------------------------------------------------- */

function CtaFooter() {
  return (
    <section className="border-t border-white/5 px-6 py-16">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            See the read zone live.
          </h2>
          <p className="mt-1 text-[13px] text-white/55">
            Synthetic automaker-shaped data, real Claude tool-calling.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#060912] transition-colors hover:bg-white/90"
          >
            Open the demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared section header ---------------------------------------- */

function SectionHead({ num, title }: { num: string; title: string }) {
  return (
    <>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/45">
        {num}
      </p>
      <h2 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
        {title}
      </h2>
    </>
  );
}
