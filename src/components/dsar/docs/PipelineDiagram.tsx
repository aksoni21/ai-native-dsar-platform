const NODES = [
  { n: '01', title: 'Intake', desc: 'Portal form → verified request', final: false },
  { n: '02', title: 'Orchestration', desc: 'Plans steps, invokes tools', final: false },
  { n: '03', title: 'Agent tools', desc: 'Read-only search & reasoning', final: false },
  { n: '04', title: 'Approval gate', desc: 'Human sign-off required', final: true },
];

export function PipelineDiagram() {
  return (
    <div className="mt-7 overflow-hidden rounded-2xl bg-[hsl(var(--foreground))] p-[26px]">
      <div className="flex flex-wrap items-stretch gap-2.5">
        {NODES.map((node, i) => (
          <div key={node.n} className="flex flex-1 items-stretch gap-2.5" style={{ minWidth: 120 }}>
            <div
              className="flex-1 rounded-xl border p-3.5"
              style={
                node.final
                  ? { background: 'hsl(var(--success) / 0.14)', borderColor: 'hsl(var(--success-on-dark) / 0.4)' }
                  : { background: 'hsl(var(--ink-soft))', borderColor: 'hsl(var(--ink-border))' }
              }
            >
              <div className="font-mono text-[10.5px]" style={{ color: node.final ? 'hsl(var(--success-on-dark))' : 'hsl(var(--accent-on-dark))' }}>
                {node.n}
              </div>
              <div className="mt-1.5 text-[13px] font-bold text-white">{node.title}</div>
              <div className="mt-1 text-[11px] leading-snug" style={{ color: node.final ? '#8FB7A9' : 'hsl(var(--text-faint))' }}>
                {node.desc}
              </div>
            </div>
            {i < NODES.length - 1 && (
              <div className="flex items-center text-base text-[#3A4152]">→</div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2.5 border-t border-[hsl(var(--ink-border))] pt-3 font-mono text-[11px] text-[hsl(var(--text-faint))]">
        <span className="h-[7px] w-[7px] rounded-full bg-[hsl(var(--success-on-dark))]" />
        Every step writes to the evidence &amp; audit layer
      </div>
    </div>
  );
}
