const TOC_ITEMS = [
  { href: '#overview', label: 'Overview' },
  { href: '#intake', label: '1 · Intake' },
  { href: '#orchestration', label: '2 · Orchestration' },
  { href: '#tools', label: '3 · Agent tools' },
  { href: '#connectors', label: '4 · Connectors' },
  { href: '#evidence', label: '5 · Evidence & audit' },
  { href: '#gates', label: '6 · Approval gates' },
];

export function Toc() {
  return (
    <aside className="lg:sticky lg:top-24">
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[hsl(var(--text-faint))]">
        On this page
      </div>
      <div className="mt-3.5 flex flex-col border-l border-border">
        {TOC_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="-ml-px border-l-2 border-transparent py-1.5 pl-3.5 text-[13.5px] text-[hsl(var(--text-secondary))] hover:border-primary hover:text-primary"
          >
            {item.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
