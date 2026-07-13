import { Badge } from '@/components/ui/badge';
import type { MatchRow } from './realData';

function AgentAvatar() {
  return (
    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg bg-[hsl(var(--accent-tint))] text-[12px] font-extrabold text-primary">
      A
    </span>
  );
}

interface AgentPanelProps {
  statusLabel: string;
  operatorMessage: string;
  matches: MatchRow[];
  reasoning: string;
  includedCount: number;
  reviewCount: number;
  proposedActionText: string;
}

export function AgentPanel({
  statusLabel,
  operatorMessage,
  matches,
  reasoning,
  includedCount,
  reviewCount,
  proposedActionText,
}: AgentPanelProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-[hsl(var(--line-soft))] px-[18px] py-3.5">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[hsl(var(--accent-tint))] text-[13px] font-extrabold text-primary">
          A
        </span>
        <div>
          <div className="text-sm font-bold text-foreground">Privacy agent</div>
          <div className="text-[11.5px] text-[hsl(var(--text-faint))]">
            Governed · read-only tools · all actions gated
          </div>
        </div>
        <span className="ml-auto">
          <Badge variant="success">{statusLabel}</Badge>
        </span>
      </div>

      <div className="flex flex-col gap-3.5 p-[18px]">
        {/* operator message */}
        <div className="max-w-[78%] self-end rounded-[13px] rounded-tr-[3px] bg-[hsl(var(--foreground))] px-3.5 py-2.5 text-[13.5px] leading-snug text-white">
          {operatorMessage}
        </div>

        {/* tool call */}
        <div className="flex items-start gap-2.5">
          <AgentAvatar />
          <div className="flex-1">
            <div className="text-[13.5px] leading-relaxed text-[hsl(var(--text-secondary))]">
              I&apos;ll search connected source systems for records matching the verified identity. Running a
              read-only lookup now.
            </div>
            <div className="mt-2.5 overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-2.5 border-b border-[hsl(var(--line-soft))] bg-[hsl(var(--line-soft-2))] px-3.5 py-2.5 font-mono text-xs text-[hsl(var(--text-secondary))]">
                <span className="text-primary">tool_call</span> search_sources({'{ email, last_name }'})
                <span className="ml-auto text-[11px] font-semibold text-[hsl(var(--success))]">200 OK</span>
              </div>
              <div className="py-1.5">
                {matches.map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-[hsl(var(--line-soft-2))] px-3.5 py-2.5 last:border-b-0"
                  >
                    <span className="font-mono text-[11.5px] font-semibold text-foreground">{r.system}</span>
                    <span className="text-[12.5px] text-muted-foreground">{r.field}</span>
                    <Badge variant={r.confidence === 'high' ? 'success' : 'warn'} className="uppercase">
                      {r.confidence}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* match reasoning */}
        <div className="flex items-start gap-2.5">
          <AgentAvatar />
          <div className="flex-1 rounded-xl border border-border bg-[hsl(var(--line-soft-2))] px-4 py-3.5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--text-faint))]">
              Match reasoning
            </div>
            <div className="text-[13.5px] leading-relaxed text-[hsl(var(--text-secondary))]">{reasoning}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="success">{includedCount} include</Badge>
              {reviewCount > 0 && <Badge variant="warn">{reviewCount} needs review</Badge>}
            </div>
          </div>
        </div>

        {/* proposed action */}
        <div className="flex items-start gap-2.5">
          <AgentAvatar />
          <div className="flex-1 text-[13.5px] leading-snug text-[hsl(var(--text-secondary))]">
            {proposedActionText}
          </div>
        </div>
      </div>
    </div>
  );
}
