import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '../shared/CodeBlock';

export function OpenSourceSection() {
  return (
    <section className="border-t border-[hsl(var(--line-soft-3))] bg-secondary">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-8 py-20 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em] text-primary">
            Open source
          </div>
          <h2 className="mt-3.5 text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground">
            Transparent, inspectable, extensible
          </h2>
          <p className="mt-4 text-[17px] leading-[1.55] text-[hsl(var(--text-body))]">
            Read the orchestration logic, audit the agent tools, and add your own source-system connectors.
            Nothing about how decisions are made is hidden behind a black box.
          </p>
          <div className="mt-6 flex flex-wrap gap-3.5">
            <Button asChild className="gap-2 rounded-[11px] bg-[hsl(var(--foreground))] text-[15.5px] font-semibold text-white hover:bg-black">
              <a href="https://github.com" target="_blank" rel="noreferrer">
                <span className="font-mono">★</span> Explore on GitHub
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-[11px] border-[hsl(var(--input))] text-[15.5px] font-semibold hover:border-foreground">
              <Link href="/dsar/docs">Read the architecture</Link>
            </Button>
          </div>
        </div>
        <CodeBlock>
          <div className="text-[#5B6172]">// register a source-system connector</div>
          <div>
            <span className="text-[hsl(var(--accent-on-dark))]">registerConnector</span>(
            <span className="text-[hsl(var(--success-on-dark))]">&quot;crm&quot;</span>, {'{'}
          </div>
          <div className="pl-[18px]">
            search: <span className="text-[hsl(var(--accent-on-dark))]">async</span> (identity) =&gt; {'{ … }'},
          </div>
          <div className="pl-[18px]">
            sideEffects: <span className="text-[hsl(var(--warn-on-dark))]">&quot;gated&quot;</span>,{' '}
            <span className="text-[#5B6172]">// never auto-run</span>
          </div>
          <div className="pl-[18px]">
            audit: <span className="text-[hsl(var(--success-on-dark))]">true</span>
          </div>
          <div>{'}'});</div>
          <div className="mt-3 text-[#5B6172]">→ connector visible in operator tool-call log</div>
        </CodeBlock>
      </div>
    </section>
  );
}
