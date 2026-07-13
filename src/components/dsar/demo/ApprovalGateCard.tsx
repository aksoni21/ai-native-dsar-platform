'use client';

import { Button } from '@/components/ui/button';

export type GatePhase = 'pending' | 'approved' | 'rejected';

interface ApprovalGateCardProps {
  phase: GatePhase;
  title: string;
  description: string;
  facts: string[];
  executedSummary: string;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
}

const GATE_TOKENS: Record<GatePhase, { border: string; headBg: string; tagFg: string; tag: string }> = {
  pending: { border: 'hsl(var(--warn-tint-border))', headBg: 'hsl(var(--warn-tint))', tagFg: 'hsl(var(--warning))', tag: 'Approval gate' },
  approved: { border: 'hsl(var(--success-tint-border))', headBg: 'hsl(var(--success-tint))', tagFg: 'hsl(var(--success))', tag: 'Approved' },
  rejected: { border: 'hsl(var(--danger-tint-border))', headBg: 'hsl(var(--danger-tint))', tagFg: 'hsl(var(--destructive))', tag: 'Rejected' },
};

export function ApprovalGateCard({
  phase,
  title,
  description,
  facts,
  executedSummary,
  onApprove,
  onReject,
  onReset,
}: ApprovalGateCardProps) {
  const tokens = GATE_TOKENS[phase];

  return (
    <div className="overflow-hidden rounded-2xl bg-card" style={{ border: `1px solid ${tokens.border}` }}>
      <div
        className="flex items-center gap-2.5 border-b px-4 py-3.5"
        style={{ background: tokens.headBg, borderColor: tokens.border }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: tokens.tagFg }}>
          {tokens.tag}
        </span>
        <span className="ml-auto font-mono text-[11px] text-[hsl(var(--text-faint))]">side_effect</span>
      </div>

      <div className="p-4">
        <div className="text-[14.5px] font-bold text-foreground">{title}</div>
        <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{description}</div>
        <div className="mt-3.5 flex flex-col gap-2">
          {facts.map((f) => (
            <Fact key={f}>{f}</Fact>
          ))}
        </div>

        {phase === 'pending' && (
          <div className="mt-4 flex flex-col gap-2.5">
            <Button
              onClick={onApprove}
              className="w-full rounded-[10px] bg-[hsl(var(--success))] py-3 text-sm font-bold hover:bg-[hsl(var(--success-hover))]"
            >
              Approve action
            </Button>
            <div className="flex gap-2.5">
              <Button
                onClick={onReject}
                variant="outline"
                className="flex-1 rounded-[10px] border-[hsl(var(--danger-tint-border))] text-[13px] font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--danger-tint))]"
              >
                Reject
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-[10px] text-[13px] font-semibold text-[hsl(var(--text-secondary))] hover:border-foreground"
              >
                Request changes
              </Button>
            </div>
            <div className="mt-0.5 text-center text-[11px] text-[hsl(var(--text-faint))]">
              Nothing is sent until you approve.
            </div>
          </div>
        )}

        {phase === 'approved' && (
          <>
            <div className="mt-4 rounded-xl border border-[hsl(var(--success-tint-border))] bg-[hsl(var(--success-tint))] px-3.5 py-3.5">
              <div className="flex items-center gap-2 text-[13.5px] font-bold text-[hsl(var(--success-hover))]">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[hsl(var(--success))] text-[11px] text-white">
                  ✓
                </span>
                Approved &amp; executed
              </div>
              <div className="mt-1.5 text-xs leading-snug text-[hsl(var(--success-hover))]">
                {executedSummary}
              </div>
            </div>
            <Button
              onClick={onReset}
              variant="outline"
              className="mt-3 w-full rounded-[9px] text-[12.5px] font-semibold text-[hsl(var(--text-secondary))] hover:border-foreground"
            >
              Reset demo
            </Button>
          </>
        )}

        {phase === 'rejected' && (
          <>
            <div className="mt-4 rounded-xl border border-[hsl(var(--danger-tint-border))] bg-[hsl(var(--danger-tint))] px-3.5 py-3.5">
              <div className="flex items-center gap-2 text-[13.5px] font-bold text-[hsl(var(--danger-text))]">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[hsl(var(--destructive))] text-[11px] text-white">
                  ✕
                </span>
                Rejected
              </div>
              <div className="mt-1.5 text-xs leading-snug text-[hsl(var(--danger-text))]">
                No action taken. The agent will revise the proposal. Nothing left the system.
              </div>
            </div>
            <Button
              onClick={onReset}
              variant="outline"
              className="mt-3 w-full rounded-[9px] text-[12.5px] font-semibold text-[hsl(var(--text-secondary))] hover:border-foreground"
            >
              Reset demo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px] text-[hsl(var(--text-secondary))]">
      <span className="text-primary">•</span> {children}
    </div>
  );
}
