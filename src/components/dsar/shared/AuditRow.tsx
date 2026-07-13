import { cn } from '@/lib/utils';

export interface AuditRowData {
  t: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  text: string;
}

interface AuditRowProps extends AuditRowData {
  dark?: boolean;
  animate?: boolean;
}

/** `[mono timestamp] [tag badge] [text]` — used by Homepage's governance
 * audit card and the Demo screen's audit trail. Tag colors are per-row
 * (mocked data carries its own bg/fg), so they're passed as raw CSS colors
 * rather than routed through the shared badge variants. */
export function AuditRow({ t, tag, tagBg, tagFg, text, dark, animate }: AuditRowProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 border-b px-4 py-2.5 last:border-b-0',
        dark ? 'border-[hsl(var(--ink-border-2))]' : 'border-[hsl(var(--line-soft-2))]',
        animate && 'dsar-rowin'
      )}
    >
      <span
        className={cn(
          'w-11 flex-none font-mono text-[10.5px]',
          dark ? 'text-[#5B6172]' : 'text-[hsl(var(--text-faint))]'
        )}
      >
        {t}
      </span>
      <span
        className="flex-none rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
        style={{ background: tagBg, color: tagFg }}
      >
        {tag}
      </span>
      <span
        className={cn('text-xs leading-snug', dark ? 'text-[#C6CBD8]' : 'text-[hsl(var(--text-secondary))]')}
      >
        {text}
      </span>
    </div>
  );
}
